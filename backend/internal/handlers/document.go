package handlers

import (
	"net/http"
	"patrasaar-backend/internal/models"
	"patrasaar-backend/internal/services"

	"github.com/gin-gonic/gin"
)

type DocumentHandler struct {
	documentService *services.DocumentService
}

func NewDocumentHandler(documentService *services.DocumentService) *DocumentHandler {
	return &DocumentHandler{
		documentService: documentService,
	}
}

func (h *DocumentHandler) GetDocumentStatus(c *gin.Context) {
	documentID := c.Param("id")
	if documentID == "" {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error: "Document ID is required",
			Code:  "MISSING_DOCUMENT_ID",
		})
		return
	}

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

	response := models.StatusResponse{
		Status: document.Status,
	}

	if document.Summary != nil {
		response.Summary = document.Summary
	}

	c.JSON(http.StatusOK, response)
}

func (h *DocumentHandler) GetDocument(c *gin.Context) {
	documentID := c.Param("id")
	if documentID == "" {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error: "Document ID is required",
			Code:  "MISSING_DOCUMENT_ID",
		})
		return
	}

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

	c.JSON(http.StatusOK, document)
}