package middleware

import (
	"log"
	"net/http"
	"patrasaar-backend/internal/models"

	"github.com/gin-gonic/gin"
)

func ErrorHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()

		// Handle any errors that occurred during request processing
		if len(c.Errors) > 0 {
			err := c.Errors.Last()
			
			log.Printf("Request error: %v", err.Err)

			// Return appropriate error response
			c.JSON(http.StatusInternalServerError, models.ErrorResponse{
				Error: "Internal server error",
				Code:  "INTERNAL_ERROR",
			})
		}
	}
}

func Recovery() gin.HandlerFunc {
	return gin.CustomRecovery(func(c *gin.Context, recovered interface{}) {
		log.Printf("Panic recovered: %v", recovered)
		
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error: "Internal server error",
			Code:  "PANIC_RECOVERED",
		})
	})
}