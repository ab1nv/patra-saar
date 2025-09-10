package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

type AIService struct {
	endpoint   string
	httpClient *http.Client
	maxRetries int
}

type AIRequest struct {
	Model    string    `json:"model"`
	Messages []Message `json:"messages"`
	Stream   bool      `json:"stream,omitempty"`
}

type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type AIResponse struct {
	Choices []Choice `json:"choices"`
}

type Choice struct {
	Message Message `json:"message"`
}

type StreamResponse struct {
	Choices []StreamChoice `json:"choices"`
}

type StreamChoice struct {
	Delta Delta `json:"delta"`
}

type Delta struct {
	Content string `json:"content"`
}

func NewAIService(endpoint string, timeout time.Duration, maxRetries int) *AIService {
	return &AIService{
		endpoint: endpoint,
		httpClient: &http.Client{
			Timeout: timeout,
		},
		maxRetries: maxRetries,
	}
}

func (s *AIService) GenerateSummary(ctx context.Context, documentText string) (string, error) {
	prompt := fmt.Sprintf(`You are an expert in Indian legal documents. Please provide a clear, concise summary of the following legal document in simple language that ordinary people can understand. Focus on:

1. Main purpose of the document
2. Key parties involved
3. Important terms and conditions
4. Rights and obligations
5. Any deadlines or important dates

Document text:
%s

Please provide the summary in simple, non-technical language:`, documentText)

	request := AIRequest{
		Model: "gpt-3.5-turbo", // This will be replaced with your fine-tuned model
		Messages: []Message{
			{
				Role:    "system",
				Content: "You are a helpful assistant that specializes in explaining Indian legal documents in simple language.",
			},
			{
				Role:    "user",
				Content: prompt,
			},
		},
		Stream: false,
	}

	var lastErr error
	for attempt := 0; attempt <= s.maxRetries; attempt++ {
		if attempt > 0 {
			// Exponential backoff
			backoff := time.Duration(attempt*attempt) * time.Second
			select {
			case <-ctx.Done():
				return "", ctx.Err()
			case <-time.After(backoff):
			}
		}

		response, err := s.makeRequest(ctx, request)
		if err != nil {
			lastErr = err
			continue
		}

		if len(response.Choices) == 0 {
			lastErr = fmt.Errorf("no response choices received")
			continue
		}

		return strings.TrimSpace(response.Choices[0].Message.Content), nil
	}

	return "", fmt.Errorf("failed to generate summary after %d attempts: %w", s.maxRetries+1, lastErr)
}

func (s *AIService) StreamQuery(ctx context.Context, question, documentContext string) (<-chan string, error) {
	prompt := fmt.Sprintf(`Based on the following legal document, please answer the user's question in simple, easy-to-understand language. If the answer is not directly available in the document, please say so clearly.

Document context:
%s

User question: %s

Please provide a clear, helpful answer:`, documentContext, question)

	request := AIRequest{
		Model: "gpt-3.5-turbo", // This will be replaced with your fine-tuned model
		Messages: []Message{
			{
				Role:    "system",
				Content: "You are a helpful assistant that answers questions about Indian legal documents in simple language.",
			},
			{
				Role:    "user",
				Content: prompt,
			},
		},
		Stream: true,
	}

	responseChan := make(chan string, 100)

	go func() {
		defer close(responseChan)

		if err := s.streamRequest(ctx, request, responseChan); err != nil {
			// Send error as the last message
			select {
			case responseChan <- fmt.Sprintf("Error: %s", err.Error()):
			case <-ctx.Done():
			}
		}
	}()

	return responseChan, nil
}

func (s *AIService) makeRequest(ctx context.Context, request AIRequest) (*AIResponse, error) {
	jsonData, err := json.Marshal(request)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", s.endpoint+"/v1/chat/completions", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	// Add authentication headers if needed
	// req.Header.Set("Authorization", "Bearer "+apiKey)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to make request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API request failed with status %d: %s", resp.StatusCode, string(body))
	}

	var response AIResponse
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &response, nil
}

func (s *AIService) streamRequest(ctx context.Context, request AIRequest, responseChan chan<- string) error {
	jsonData, err := json.Marshal(request)
	if err != nil {
		return fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", s.endpoint+"/v1/chat/completions", bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "text/event-stream")
	// Add authentication headers if needed
	// req.Header.Set("Authorization", "Bearer "+apiKey)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to make request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("API request failed with status %d: %s", resp.StatusCode, string(body))
	}

	// Read streaming response
	decoder := json.NewDecoder(resp.Body)
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		var streamResp StreamResponse
		if err := decoder.Decode(&streamResp); err != nil {
			if err == io.EOF {
				break
			}
			return fmt.Errorf("failed to decode stream response: %w", err)
		}

		if len(streamResp.Choices) > 0 && streamResp.Choices[0].Delta.Content != "" {
			select {
			case responseChan <- streamResp.Choices[0].Delta.Content:
			case <-ctx.Done():
				return ctx.Err()
			}
		}
	}

	return nil
}

func (s *AIService) HandleRateLimit() error {
	// Implement rate limiting logic here
	// For now, just add a small delay
	time.Sleep(100 * time.Millisecond)
	return nil
}