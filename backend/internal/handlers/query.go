package handlers

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"patrasaar-backend/internal/models"
	"patrasaar-backend/internal/services"
	"time"

	"github.com/gin-gonic/gin"
)

type QueryHandler struct {
	documentService *services.DocumentService
	aiService       *services.AIService
}

func NewQueryHandler(documentService *services.DocumentService, aiService *services.AIService) *QueryHandler {
	return &QueryHandler{
		documentService: documentService,
		aiService:       aiService,
	}
}

func (h *QueryHandler) QueryDocument(c *gin.Context) {
	documentID := c.Param("id")
	if documentID == "" {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error: "Document ID is required",
			Code:  "MISSING_DOCUMENT_ID",
		})
		return
	}

	var req models.QueryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error: "Invalid request body",
			Code:  "INVALID_REQUEST",
			Details: err.Error(),
		})
		return
	}

	// Get document
	document, err := h.documentService.GetDocument(c.Request.Context(), documentID)
	if err != nil {
		if err.Error() == "document not found" {
			c.JSON(http.StatusNotFound, models.ErrorResponse{
				Error: "Document not found",
				Code:  "DOCUMENT_NOT_FOUND",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error: "Failed to retrieve document",
			Code:  "DATABASE_ERROR",
			Details: err.Error(),
		})
		return
	}

	// Check if document is ready
	if document.Status != models.StatusCompleted {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error: "Document is not ready for queries",
			Code:  "DOCUMENT_NOT_READY",
			Details: fmt.Sprintf("Document status: %s", document.Status),
		})
		return
	}

	// Create context with timeout
	ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Minute)
	defer cancel()

	// Get streaming response from AI service
	responseChan, err := h.aiService.StreamQuery(ctx, req.Question, document.RawText)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error: "Failed to process query",
			Code:  "AI_SERVICE_ERROR",
			Details: err.Error(),
		})
		return
	}

	// Set headers for Server-Sent Events
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("Access-Control-Allow-Origin", "*")

	// Stream the response
	c.Stream(func(w io.Writer) bool {
		select {
		case chunk, ok := <-responseChan:
			if !ok {
				// Channel closed, end stream
				return false
			}
			
			// Send chunk as SSE
			c.SSEvent("message", chunk)
			return true
		case <-ctx.Done():
			// Context cancelled or timed out
			c.SSEvent("error", "Request timeout")
			return false
		}
	})
}

func (h *QueryHandler) QueryDocumentSimple(c *gin.Context) {
	documentID := c.Param("id")
	if documentID == "" {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error: "Document ID is required",
			Code:  "MISSING_DOCUMENT_ID",
		})
		return
	}

	var req models.QueryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error: "Invalid request body",
			Code:  "INVALID_REQUEST",
			Details: err.Error(),
		})
		return
	}

	// Get document
	document, err := h.documentService.GetDocument(c.Request.Context(), documentID)
	if err != nil {
		if err.Error() == "document not found" {
			c.JSON(http.StatusNotFound, models.ErrorResponse{
				Error: "Document not found",
				Code:  "DOCUMENT_NOT_FOUND",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error: "Failed to retrieve document",
			Code:  "DATABASE_ERROR",
			Details: err.Error(),
		})
		return
	}

	// Check if document is ready
	if document.Status != models.StatusCompleted {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error: "Document is not ready for queries",
			Code:  "DOCUMENT_NOT_READY",
			Details: fmt.Sprintf("Document status: %s", document.Status),
		})
		return
	}

	// For now, return a simple mock response since we don't have the AI service running
	// This will be replaced with actual AI integration
	mockResponse := fmt.Sprintf("Based on your document '%s', here's what I understand about your question: %s\n\nThis is a mock response. The actual AI service integration will provide detailed legal explanations in simple language.", document.Filename, req.Question)

	c.JSON(http.StatusOK, models.QueryResponse{
		Answer: mockResponse,
	})
}