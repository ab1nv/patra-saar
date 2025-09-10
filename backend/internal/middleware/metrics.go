package middleware

import (
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// Simple in-memory metrics (in production, use Prometheus or similar)
type Metrics struct {
	RequestCount    map[string]int64
	RequestDuration map[string]time.Duration
	ErrorCount      map[string]int64
}

var appMetrics = &Metrics{
	RequestCount:    make(map[string]int64),
	RequestDuration: make(map[string]time.Duration),
	ErrorCount:      make(map[string]int64),
}

func MetricsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.FullPath()
		method := c.Request.Method

		// Process request
		c.Next()

		// Record metrics
		duration := time.Since(start)
		statusCode := c.Writer.Status()
		
		key := method + " " + path
		
		// Increment request count
		appMetrics.RequestCount[key]++
		
		// Record duration
		appMetrics.RequestDuration[key] = duration
		
		// Record errors (4xx and 5xx)
		if statusCode >= 400 {
			errorKey := key + " " + strconv.Itoa(statusCode)
			appMetrics.ErrorCount[errorKey]++
		}
	}
}

func GetMetrics() *Metrics {
	return appMetrics
}