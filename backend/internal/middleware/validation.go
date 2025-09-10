package middleware

import (
	"net/http"
	"patrasaar-backend/internal/models"
	"strings"

	"github.com/gin-gonic/gin"
)

func ValidateContentType(allowedTypes ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		contentType := c.GetHeader("Content-Type")
		
		// Skip validation for GET requests
		if c.Request.Method == "GET" {
			c.Next()
			return
		}

		for _, allowed := range allowedTypes {
			if strings.Contains(contentType, allowed) {
				c.Next()
				return
			}
		}

		c.JSON(http.StatusUnsupportedMediaType, models.ErrorResponse{
			Error: "Unsupported content type",
			Code:  "INVALID_CONTENT_TYPE",
		})
		c.Abort()
	}
}

func SanitizeInput() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Add input sanitization logic here
		// For now, just continue to next handler
		c.Next()
	}
}