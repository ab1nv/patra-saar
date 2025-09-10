package services

import (
	"context"
	"fmt"
	"patrasaar-backend/internal/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type DocumentServiceInterface interface {
	CreateDocument(ctx context.Context, filename, rawText, contentType string, fileSize int64) (*models.Document, error)
	GetDocument(ctx context.Context, id string) (*models.Document, error)
	UpdateDocumentStatus(ctx context.Context, id string, status models.DocumentStatus) error
	UpdateDocumentSummary(ctx context.Context, id string, summary string) error
}

type DocumentService struct {
	db *pgxpool.Pool
}

func NewDocumentService(db *pgxpool.Pool) *DocumentService {
	return &DocumentService{db: db}
}

func (s *DocumentService) CreateDocument(ctx context.Context, filename, rawText, contentType string, fileSize int64) (*models.Document, error) {
	query := `
		INSERT INTO documents (filename, raw_text, content_type, file_size, status)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, filename, raw_text, summary, status, created_at, updated_at, file_size, content_type
	`

	var doc models.Document
	err := s.db.QueryRow(ctx, query, filename, rawText, contentType, fileSize, models.StatusPending).Scan(
		&doc.ID, &doc.Filename, &doc.RawText, &doc.Summary, &doc.Status,
		&doc.CreatedAt, &doc.UpdatedAt, &doc.FileSize, &doc.ContentType,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create document: %w", err)
	}

	return &doc, nil
}

func (s *DocumentService) GetDocument(ctx context.Context, id string) (*models.Document, error) {
	query := `
		SELECT id, filename, raw_text, summary, status, created_at, updated_at, file_size, content_type
		FROM documents
		WHERE id = $1
	`

	var doc models.Document
	err := s.db.QueryRow(ctx, query, id).Scan(
		&doc.ID, &doc.Filename, &doc.RawText, &doc.Summary, &doc.Status,
		&doc.CreatedAt, &doc.UpdatedAt, &doc.FileSize, &doc.ContentType,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("document not found")
		}
		return nil, fmt.Errorf("failed to get document: %w", err)
	}

	return &doc, nil
}

func (s *DocumentService) UpdateDocumentStatus(ctx context.Context, id string, status models.DocumentStatus) error {
	query := `
		UPDATE documents 
		SET status = $1, updated_at = CURRENT_TIMESTAMP
		WHERE id = $2
	`

	result, err := s.db.Exec(ctx, query, status, id)
	if err != nil {
		return fmt.Errorf("failed to update document status: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("document not found")
	}

	return nil
}

func (s *DocumentService) UpdateDocumentSummary(ctx context.Context, id string, summary string) error {
	query := `
		UPDATE documents 
		SET summary = $1, status = $2, updated_at = CURRENT_TIMESTAMP
		WHERE id = $3
	`

	result, err := s.db.Exec(ctx, query, summary, models.StatusCompleted, id)
	if err != nil {
		return fmt.Errorf("failed to update document summary: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("document not found")
	}

	return nil
}