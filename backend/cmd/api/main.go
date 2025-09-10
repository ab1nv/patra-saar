package main

import (
	"log"
	"net/http"
	"os"
	"patrasaar-backend/internal/config"
	"patrasaar-backend/internal/handlers"
	"patrasaar-backend/internal/middleware"
	"patrasaar-backend/internal/services"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

func main() {
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
	textExtractor := services.NewDocumentProcessor(50*1024*1024, 100) // 50MB, 100 pages
	taskService := services.NewTaskService(redisHost + ":" + redisPort)
	defer taskService.Close()

	// Initialize handlers
	uploadHandler := handlers.NewUploadHandler(documentService, textExtractor, taskService)
	documentHandler := handlers.NewDocumentHandler(documentService)

	// Setup Gin router
	r := gin.Default()

	// Add middleware
	r.Use(middleware.Recovery())
	r.Use(middleware.ErrorHandler())
	r.Use(middleware.RequestLogger())
	r.Use(middleware.MetricsMiddleware())
	r.Use(middleware.SecurityHeaders())
	r.Use(middleware.PreventDirectoryTraversal())
	r.Use(middleware.RequestSizeLimit(60 * 1024 * 1024)) // 60MB limit
	
	// Rate limiting
	rateLimiter := middleware.NewRateLimiter(100, time.Minute) // 100 requests per minute
	r.Use(rateLimiter.Middleware())

	// CORS middleware
	r.Use(func(c *gin.Context) {
		origin := getEnv("FRONTEND_URL", "http://localhost:3000")
		c.Header("Access-Control-Allow-Origin", origin)
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")
		
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		
		c.Next()
	})

	// Initialize health handler
	healthHandler := handlers.NewHealthHandler(db, nil) // Redis client can be added later

	// Health check endpoints
	r.GET("/health", healthHandler.HealthCheck)
	r.GET("/ready", healthHandler.ReadinessCheck)
	r.GET("/live", healthHandler.LivenessCheck)

	// API routes
	api := r.Group("/api")
	{
		api.GET("/health", healthHandler.HealthCheck)
		api.GET("/metrics", func(c *gin.Context) {
			metrics := middleware.GetMetrics()
			c.JSON(http.StatusOK, metrics)
		})

		// Initialize AI service and query handler
		aiService := services.NewAIService("http://localhost:8000", 120*time.Second, 3)
		queryHandler := handlers.NewQueryHandler(documentService, aiService)

		// Document routes
		api.POST("/upload", 
			middleware.ValidateContentType("multipart/form-data"),
			middleware.ValidateFileUpload(),
			uploadHandler.UploadDocument)
		api.GET("/documents/:id/status", documentHandler.GetDocumentStatus)
		api.GET("/documents/:id", documentHandler.GetDocument)
		api.POST("/documents/:id/query", 
			middleware.ValidateContentType("application/json"),
			middleware.SanitizeInput(),
			queryHandler.QueryDocumentSimple)
		api.GET("/documents/:id/query/stream", queryHandler.QueryDocument)
	}

	log.Println("Starting PatraSaar API server on :8080")
	if err := r.Run(":8080"); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}