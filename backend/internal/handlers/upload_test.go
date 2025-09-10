package handlers

import (
	"bytes"
	"context"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"patrasaar-backend/internal/models"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// Mock services for testing
type MockDocumentService struct {
	mock.Mock
}

func (m *MockDocumentService) CreateDocument(ctx context.Context, filename, rawText, contentType string, fileSize int64) (*models.Document, error) {
	args := m.Called(ctx, filename, rawText, contentType, fileSize)
	return args.Get(0).(*models.Document), args.Error(1)
}

func (m *MockDocumentService) GetDocument(ctx context.Context, id string) (*models.Document, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(*models.Document), args.Error(1)
}

func (m *MockDocumentService) UpdateDocumentStatus(ctx context.Context, id string, status models.DocumentStatus) error {
	args := m.Called(ctx, id, status)
	return args.Error(0)
}

func (m *MockDocumentService) UpdateDocumentSummary(ctx context.Context, id string, summary string) error {
	args := m.Called(ctx, id, summary)
	return args.Error(0)
}



type MockTextExtractor struct {
	mock.Mock
}

func (m *MockTextExtractor) ValidateFile(header *multipart.FileHeader, maxPages int) error {
	args := m.Called(header, maxPages)
	return args.Error(0)
}

func (m *MockTextExtractor) Extract(file io.Reader, contentType string) (string, error) {
	args := m.Called(file, contentType)
	return args.String(0), args.Error(1)
}

type MockTaskService struct {
	mock.Mock
}

func (m *MockTaskService) EnqueueSummaryGeneration(ctx context.Context, documentID string) error {
	args := m.Called(ctx, documentID)
	return args.Error(0)
}

func (m *MockTaskService) Close() error {
	args := m.Called()
	return args.Error(0)
}

func TestUploadHandler_UploadDocument(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		setupMocks     func(*MockDocumentService, *MockTextExtractor, *MockTaskService)
		expectedStatus int
		expectedError  string
	}{
		{
			name: "Successful upload",
			setupMocks: func(ds *MockDocumentService, te *MockTextExtractor, ts *MockTaskService) {
				te.On("ValidateFile", mock.Anything, 100).Return(nil)
				te.On("Extract", mock.Anything, mock.Anything).Return("Extracted text", nil)
				ds.On("CreateDocument", mock.Anything, mock.Anything, "Extracted text", mock.Anything, mock.Anything).
					Return(&models.Document{ID: "test-id", Filename: "test.pdf"}, nil)
				ts.On("EnqueueSummaryGeneration", mock.Anything, "test-id").Return(nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name: "Validation error",
			setupMocks: func(ds *MockDocumentService, te *MockTextExtractor, ts *MockTaskService) {
				te.On("ValidateFile", mock.Anything, 100).Return(assert.AnError)
			},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup mocks
			mockDocService := new(MockDocumentService)
			mockTextExtractor := new(MockTextExtractor)
			mockTaskService := new(MockTaskService)
			
			tt.setupMocks(mockDocService, mockTextExtractor, mockTaskService)

			// Create handler
			handler := &UploadHandler{
				documentService: mockDocService,
				textExtractor:   mockTextExtractor,
				taskService:     mockTaskService,
			}

			// Create test request
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)

			// Create a simple multipart form for testing
			body := &bytes.Buffer{}
			writer := multipart.NewWriter(body)
			part, _ := writer.CreateFormFile("file", "test.txt")
			part.Write([]byte("test content"))
			writer.Close()

			req := httptest.NewRequest("POST", "/upload", body)
			req.Header.Set("Content-Type", writer.FormDataContentType())
			c.Request = req

			// Execute handler
			handler.UploadDocument(c)

			// Assert response
			assert.Equal(t, tt.expectedStatus, w.Code)
			
			// Verify mocks
			mockDocService.AssertExpectations(t)
			mockTextExtractor.AssertExpectations(t)
			mockTaskService.AssertExpectations(t)
		})
	}
}