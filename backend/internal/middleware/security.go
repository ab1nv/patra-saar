package middleware

import (
	"net/http"
	"patrasaar-backend/internal/models"
	"strings"

	"github.com/gin-gonic/gin"
)

func SecurityHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Prevent MIME type sniffing
		c.Header("X-Content-Type-Options", "nosniff")
		
		// Prevent clickjacking
		c.Header("X-Frame-Options", "DENY")
		
		// XSS protection
		c.Header("X-XSS-Protection", "1; mode=block")
		
		// Referrer policy
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
		
		// Content Security Policy
		csp := "default-src 'self'; " +
			"script-src 'self' 'unsafe-inline'; " +
			"style-src 'self' 'unsafe-inline'; " +
			"img-src 'self' data: https:; " +
			"font-src 'self'; " +
			"connect-src 'self'; " +
			"frame-ancestors 'none';"
		c.Header("Content-Security-Policy", csp)
		
		// HSTS (only in production with HTTPS)
		if c.Request.TLS != nil {
			c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		}
		
		c.Next()
	}
}

func ValidateFileUpload() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip validation for non-upload endpoints
		if !strings.Contains(c.Request.URL.Path, "/upload") {
			c.Next()
			return
		}

		// Check content length
		if c.Request.ContentLength > 60*1024*1024 { // 60MB limit
			c.JSON(http.StatusRequestEntityTooLarge, models.ErrorResponse{
				Error: "Request body too large",
				Code:  "REQUEST_TOO_LARGE",
			})
			c.Abort()
			return
		}

		// Validate content type for file uploads
		contentType := c.GetHeader("Content-Type")
		if !strings.Contains(contentType, "multipart/form-data") {
			c.JSON(http.StatusBadRequest, models.ErrorResponse{
				Error: "Invalid content type for file upload",
				Code:  "INVALID_CONTENT_TYPE",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

func PreventDirectoryTraversal() gin.HandlerFunc {
	return func(c *gin.Context) {
		path := c.Request.URL.Path
		
		// Check for directory traversal patterns
		if strings.Contains(path, "..") || 
		   strings.Contains(path, "//") ||
		   strings.Contains(path, "\\") {
			c.JSON(http.StatusBadRequest, models.ErrorResponse{
				Error: "Invalid path",
				Code:  "INVALID_PATH",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

func RequestSizeLimit(maxSize int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.ContentLength > maxSize {
			c.JSON(http.StatusRequestEntityTooLarge, models.ErrorResponse{
				Error: "Request body too large",
				Code:  "REQUEST_TOO_LARGE",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}