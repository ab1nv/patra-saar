package main

import (
	"log"
	"os"
	"patrasaar-backend/internal/config"
	"patrasaar-backend/internal/services"
	"strconv"
	"time"

	"github.com/hibiken/asynq"
)

func main() {
	log.Println("Starting PatraSaar Worker...")

	// Get configuration from environment variables
	dbHost := getEnv("DB_HOST", "localhost")
	dbPort, _ := strconv.Atoi(getEnv("DB_PORT", "5432"))
	dbName := getEnv("DB_NAME", "patrasaar")
	dbUser := getEnv("DB_USER", "postgres")
	dbPassword := getEnv("DB_PASSWORD", "postgres")
	redisHost := getEnv("REDIS_HOST", "localhost")
	redisPort := getEnv("REDIS_PORT", "6379")

	// Initialize database connection
	dbConfig := config.DatabaseConfig{
		Host:               dbHost,
		Port:               dbPort,
		Name:               dbName,
		User:               dbUser,
		Password:           dbPassword,
		SSLMode:            "disable",
		MaxConnections:     25,
		MaxIdleConnections: 5,
	}

	db, err := config.NewDatabasePool(dbConfig)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	// Initialize services
	documentService := services.NewDocumentService(db)
	aiService := services.NewAIService("http://localhost:8000", 120*time.Second, 3)

	// Initialize task handlers
	taskHandlers := services.NewTaskHandlers(documentService, aiService)

	// Setup worker
	srv := services.SetupWorker(redisHost+":"+redisPort, taskHandlers)

	// Setup task handlers
	mux := asynq.NewServeMux()
	mux.HandleFunc(services.TypeSummaryGeneration, taskHandlers.HandleSummaryGeneration)

	log.Println("Worker started successfully")
	if err := srv.Run(mux); err != nil {
		log.Fatal("Failed to start worker:", err)
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}