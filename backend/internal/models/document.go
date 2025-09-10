package models

import (
	"time"
)

type DocumentStatus string

const (
	StatusPending    DocumentStatus = "PENDING"
	StatusProcessing DocumentStatus = "PROCESSING"
	StatusCompleted  DocumentStatus = "COMPLETED"
	StatusFailed     DocumentStatus = "FAILED"
)

type Document struct {
	ID          string         `json:"id" db:"id"`
	Filename    string         `json:"filename" db:"filename"`
	RawText     string         `json:"raw_text" db:"raw_text"`
	Summary     *string        `json:"summary" db:"summary"`
	Status      DocumentStatus `json:"status" db:"status"`
	CreatedAt   time.Time      `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at" db:"updated_at"`
	FileSize    int64          `json:"file_size" db:"file_size"`
	ContentType string         `json:"content_type" db:"content_type"`
}

type ChatMessage struct {
	Role    string `json:"role"`    // "user" or "assistant"
	Content string `json:"content"`
}

type ChatSession struct {
	ID         string        `json:"id" db:"id"`
	DocumentID string        `json:"document_id" db:"document_id"`
	Messages   []ChatMessage `json:"messages" db:"messages"`
	CreatedAt  time.Time     `json:"created_at" db:"created_at"`
	UpdatedAt  time.Time     `json:"updated_at" db:"updated_at"`
}

// Request/Response models
type UploadResponse struct {
	DocumentID string `json:"document_id"`
	Filename   string `json:"filename"`
	RawText    string `json:"raw_text"`
}

type StatusResponse struct {
	Status  DocumentStatus `json:"status"`
	Summary *string        `json:"summary,omitempty"`
}

type QueryRequest struct {
	Question string `json:"question" binding:"required"`
}

type QueryResponse struct {
	Answer string `json:"answer"`
}

type ErrorResponse struct {
	Error   string `json:"error"`
	Code    string `json:"code"`
	Details string `json:"details,omitempty"`
}