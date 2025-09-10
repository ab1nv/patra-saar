package services

import (
	"bytes"
	"fmt"
	"io"
	"mime/multipart"
	"strings"

	"github.com/ledongthuc/pdf"
)

type TextExtractor interface {
	Extract(file io.Reader, contentType string) (string, error)
	ValidateFile(header *multipart.FileHeader, maxPages int) error
}

type DocumentProcessor struct {
	maxFileSize int64
	maxPages    int
}

func NewDocumentProcessor(maxFileSize int64, maxPages int) *DocumentProcessor {
	return &DocumentProcessor{
		maxFileSize: maxFileSize,
		maxPages:    maxPages,
	}
}

func (dp *DocumentProcessor) ValidateFile(header *multipart.FileHeader, maxPages int) error {
	// Check file size
	if header.Size > dp.maxFileSize {
		return fmt.Errorf("file size %d bytes exceeds maximum allowed size %d bytes", header.Size, dp.maxFileSize)
	}

	// Check file extension
	filename := strings.ToLower(header.Filename)
	if !strings.HasSuffix(filename, ".txt") && 
	   !strings.HasSuffix(filename, ".pdf") {
		return fmt.Errorf("unsupported file type. Only .txt and .pdf files are allowed")
	}

	return nil
}

func (dp *DocumentProcessor) Extract(file io.Reader, contentType string) (string, error) {
	switch {
	case strings.Contains(contentType, "text/plain"):
		return dp.extractText(file)
	case strings.Contains(contentType, "application/pdf"):
		return dp.extractPDF(file)
	default:
		return "", fmt.Errorf("unsupported content type: %s", contentType)
	}
}

func (dp *DocumentProcessor) extractText(file io.Reader) (string, error) {
	content, err := io.ReadAll(file)
	if err != nil {
		return "", fmt.Errorf("failed to read text file: %w", err)
	}
	return string(content), nil
}

func (dp *DocumentProcessor) extractPDF(file io.Reader) (string, error) {
	// Read all content into memory for PDF processing
	content, err := io.ReadAll(file)
	if err != nil {
		return "", fmt.Errorf("failed to read PDF file: %w", err)
	}

	// Create a bytes reader
	bytesReader := bytes.NewReader(content)

	// Open PDF reader
	pdfReader, err := pdf.NewReader(bytesReader, int64(len(content)))
	if err != nil {
		return "", fmt.Errorf("failed to create PDF reader: %w", err)
	}

	// Check page count
	numPages := pdfReader.NumPage()
	if numPages > dp.maxPages {
		return "", fmt.Errorf("PDF has %d pages, maximum allowed is %d", numPages, dp.maxPages)
	}

	var textContent strings.Builder

	// Extract text from each page
	for i := 1; i <= numPages; i++ {
		page := pdfReader.Page(i)
		if page.V.IsNull() {
			continue
		}

		text, err := page.GetPlainText(nil)
		if err != nil {
			// Log error but continue with other pages
			continue
		}

		textContent.WriteString(text)
		textContent.WriteString("\n\n")
	}

	result := strings.TrimSpace(textContent.String())
	if result == "" {
		return "", fmt.Errorf("no text content found in PDF")
	}

	return result, nil
}

