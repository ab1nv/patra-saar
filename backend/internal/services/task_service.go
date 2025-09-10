package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"patrasaar-backend/internal/models"

	"github.com/hibiken/asynq"
)

const (
	TypeSummaryGeneration = "summary:generate"
)

type TaskServiceInterface interface {
	EnqueueSummaryGeneration(ctx context.Context, documentID string) error
	Close() error
}

type TaskService struct {
	client *asynq.Client
}

type SummaryTaskPayload struct {
	DocumentID string `json:"document_id"`
}

func NewTaskService(redisAddr string) *TaskService {
	client := asynq.NewClient(asynq.RedisClientOpt{Addr: redisAddr})
	return &TaskService{client: client}
}

func (s *TaskService) Close() error {
	return s.client.Close()
}

func (s *TaskService) EnqueueSummaryGeneration(ctx context.Context, documentID string) error {
	payload := SummaryTaskPayload{
		DocumentID: documentID,
	}

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal task payload: %w", err)
	}

	task := asynq.NewTask(TypeSummaryGeneration, payloadBytes)
	
	info, err := s.client.Enqueue(task)
	if err != nil {
		return fmt.Errorf("failed to enqueue task: %w", err)
	}

	log.Printf("Enqueued summary generation task for document %s (task ID: %s)", documentID, info.ID)
	return nil
}

// Task handlers
type TaskHandlers struct {
	documentService *DocumentService
	aiService       *AIService
}

func NewTaskHandlers(documentService *DocumentService, aiService *AIService) *TaskHandlers {
	return &TaskHandlers{
		documentService: documentService,
		aiService:       aiService,
	}
}

func (h *TaskHandlers) HandleSummaryGeneration(ctx context.Context, t *asynq.Task) error {
	var payload SummaryTaskPayload
	if err := json.Unmarshal(t.Payload(), &payload); err != nil {
		return fmt.Errorf("failed to unmarshal payload: %w", err)
	}

	log.Printf("Processing summary generation for document: %s", payload.DocumentID)

	// Update document status to processing
	if err := h.documentService.UpdateDocumentStatus(ctx, payload.DocumentID, models.StatusProcessing); err != nil {
		return fmt.Errorf("failed to update document status: %w", err)
	}

	// Get document
	document, err := h.documentService.GetDocument(ctx, payload.DocumentID)
	if err != nil {
		// Update status to failed
		h.documentService.UpdateDocumentStatus(ctx, payload.DocumentID, models.StatusFailed)
		return fmt.Errorf("failed to get document: %w", err)
	}

	// Generate summary using AI service
	summary, err := h.aiService.GenerateSummary(ctx, document.RawText)
	if err != nil {
		// Update status to failed
		h.documentService.UpdateDocumentStatus(ctx, payload.DocumentID, models.StatusFailed)
		return fmt.Errorf("failed to generate summary: %w", err)
	}

	// Update document with summary
	if err := h.documentService.UpdateDocumentSummary(ctx, payload.DocumentID, summary); err != nil {
		return fmt.Errorf("failed to update document summary: %w", err)
	}

	log.Printf("Successfully generated summary for document: %s", payload.DocumentID)
	return nil
}

// Worker setup
func SetupWorker(redisAddr string, handlers *TaskHandlers) *asynq.Server {
	srv := asynq.NewServer(
		asynq.RedisClientOpt{Addr: redisAddr},
		asynq.Config{
			Concurrency: 10,
			Queues: map[string]int{
				"critical": 6,
				"default":  3,
				"low":      1,
			},
		},
	)

	mux := asynq.NewServeMux()
	mux.HandleFunc(TypeSummaryGeneration, handlers.HandleSummaryGeneration)

	return srv
}