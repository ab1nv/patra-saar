package handlers

import (
	"log"
	"net/http"
	"patrasaar-backend/internal/models"
	"patrasaar-backend/internal/services"

	"github.com/gin-gonic/gin"
)

type UploadHandler struct {
	documentService services.DocumentServiceInterface
	textExtractor   services.TextExtractor
	taskService     services.TaskServiceInterface
}

func NewUploadHandler(documentService services.DocumentServiceInterface, textExtractor services.TextExtractor, taskService services.TaskServiceInterface) *UploadHandler {
	return &UploadHandler{
		documentService: documentService,
		textExtractor:   textExtractor,
		taskService:     taskService,
	}
}

func (h *UploadHandler) UploadDocument(c *gin.Context) {
	// Get the uploaded file
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error: "No file provided",
			Code:  "INVALID_FILE",
		})
		return
	}
	defer file.Close()

	// Validate file
	if err := h.textExtractor.ValidateFile(header, 100); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error: err.Error(),
			Code:  "VALIDATION_ERROR",
		})
		return
	}

	// Extract text from the file
	text, err := h.textExtractor.Extract(file, header.Header.Get("Content-Type"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error: "Failed to extract text from document",
			Code:  "EXTRACTION_ERROR",
			Details: err.Error(),
		})
		return
	}

	// Validate extracted text
	if len(text) == 0 {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error: "No text content found in the document",
			Code:  "EMPTY_DOCUMENT",
		})
		return
	}

	// Save document to database
	document, err := h.documentService.CreateDocument(
		c.Request.Context(),
		header.Filename,
		text,
		header.Header.Get("Content-Type"),
		header.Size,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error: "Failed to save document",
			Code:  "DATABASE_ERROR",
			Details: err.Error(),
		})
		return
	}

	// Enqueue background task for summary generation
	if err := h.taskService.EnqueueSummaryGeneration(c.Request.Context(), document.ID); err != nil {
		// Log error but don't fail the upload
		log.Printf("Failed to enqueue summary task for document %s: %v", document.ID, err)
	}

	// Return success response
	c.JSON(http.StatusOK, models.UploadResponse{
		DocumentID: document.ID,
		Filename:   document.Filename,
		RawText:    document.RawText,
	})
}