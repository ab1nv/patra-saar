const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

export interface UploadResponse {
  document_id: string;
  filename: string;
  raw_text: string;
}

export interface StatusResponse {
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  summary?: string;
}

export interface QueryResponse {
  answer: string;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text();
    throw new ApiError(response.status, errorText || response.statusText);
  }
  return response.json();
}

export const api = {
  async uploadDocument(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      body: formData,
    });

    return handleResponse<UploadResponse>(response);
  },

  async getDocumentStatus(documentId: string): Promise<StatusResponse> {
    const response = await fetch(`${API_BASE_URL}/documents/${documentId}/status`);
    return handleResponse<StatusResponse>(response);
  },

  async queryDocument(documentId: string, question: string): Promise<QueryResponse> {
    const response = await fetch(`${API_BASE_URL}/documents/${documentId}/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question }),
    });

    return handleResponse<QueryResponse>(response);
  },

  // Stream query responses using Server-Sent Events
  createQueryStream(documentId: string, question: string): EventSource {
    const params = new URLSearchParams({ question });
    return new EventSource(`${API_BASE_URL}/documents/${documentId}/query/stream?${params}`);
  },

  // Stream query with callback for real-time updates
  async streamQuery(
    documentId: string, 
    question: string, 
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: string) => void
  ): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/documents/${documentId}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new ApiError(response.status, errorText || response.statusText);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          
          // Process complete lines
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.trim()) {
              // Parse SSE format
              if (line.startsWith('data: ')) {
                const chunk = line.slice(6); // Remove 'data: ' prefix
                if (chunk !== '[DONE]') {
                  onChunk(chunk);
                }
              }
            }
          }
        }
        
        onComplete();
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Failed to stream query response';
      onError(errorMessage);
    }
  },
};