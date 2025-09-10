import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api, ApiError } from '@/lib/api';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ErrorDetails {
  message: string;
  code?: string;
  details?: string;
}

interface DocumentState {
  documentId: string | null;
  filename: string;
  rawText: string;
  summary: string | null;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  chatHistory: ChatMessage[];
  isLoading: boolean;
  isUploading: boolean;
  isQuerying: boolean;
  error: ErrorDetails | null;
  
  // Actions
  setDocument: (id: string, filename: string, text: string) => void;
  setSummary: (summary: string) => void;
  setStatus: (status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED') => void;
  addChatMessage: (message: ChatMessage) => void;
  setLoading: (status: boolean) => void;
  setUploading: (status: boolean) => void;
  setQuerying: (status: boolean) => void;
  setError: (error: ErrorDetails | null) => void;
  clearDocument: () => void;
  
  // API Actions
  uploadDocument: (file: File) => Promise<void>;
  pollDocumentStatus: () => Promise<void>;
  queryDocument: (question: string) => Promise<void>;
  streamQuery: (question: string) => Promise<void>;
}

export const useDocumentStore = create<DocumentState>()(
  persist(
    (set, get) => ({
      documentId: null,
      filename: '',
      rawText: '',
      summary: null,
      status: 'PENDING',
      chatHistory: [],
      isLoading: false,
      isUploading: false,
      isQuerying: false,
      error: null,
      
      setDocument: (id, filename, text) => set({ 
        documentId: id, 
        filename, 
        rawText: text, 
        isLoading: false, 
        isUploading: false,
        error: null 
      }),
      setSummary: (summary) => set({ summary }),
      setStatus: (status) => set({ status }),
      addChatMessage: (message) => set((state) => ({ 
        chatHistory: [...state.chatHistory, message] 
      })),
      setLoading: (status) => set({ isLoading: status }),
      setUploading: (status) => set({ isUploading: status }),
      setQuerying: (status) => set({ isQuerying: status }),
      setError: (error) => set({ error, isLoading: false, isUploading: false, isQuerying: false }),
      clearDocument: () => set({
        documentId: null,
        filename: '',
        rawText: '',
        summary: null,
        status: 'PENDING',
        chatHistory: [],
        isLoading: false,
        isUploading: false,
        isQuerying: false,
        error: null
      }),

      uploadDocument: async (file: File) => {
        try {
          set({ isUploading: true, error: null });
          const response = await api.uploadDocument(file);
          set({ 
            documentId: response.document_id,
            filename: response.filename,
            rawText: response.raw_text,
            status: 'PROCESSING',
            isUploading: false
          });
        } catch (error) {
          let errorDetails: ErrorDetails;
          
          if (error instanceof ApiError) {
            try {
              // Try to parse JSON error response
              const errorData = JSON.parse(error.message);
              errorDetails = {
                message: errorData.error || 'Upload failed',
                code: errorData.code,
                details: errorData.details
              };
            } catch {
              // Fallback for non-JSON error messages
              errorDetails = {
                message: 'Upload failed',
                details: error.message
              };
            }
          } else {
            errorDetails = {
              message: 'Upload failed. Please try again.',
              details: error instanceof Error ? error.message : 'Unknown error'
            };
          }
          
          set({ error: errorDetails, isUploading: false });
        }
      },

      pollDocumentStatus: async () => {
        const { documentId } = get();
        if (!documentId) return;

        try {
          const response = await api.getDocumentStatus(documentId);
          set({ 
            status: response.status,
            summary: response.summary || null
          });
        } catch (error) {
          console.error('Failed to poll document status:', error);
        }
      },

      queryDocument: async (question: string) => {
        const { documentId } = get();
        if (!documentId) return;

        try {
          set({ isQuerying: true, error: null });
          
          // Add user message immediately
          const userMessage: ChatMessage = {
            role: 'user',
            content: question,
            timestamp: new Date()
          };
          set((state) => ({ 
            chatHistory: [...state.chatHistory, userMessage] 
          }));

          // Add placeholder assistant message for streaming
          const assistantMessage: ChatMessage = {
            role: 'assistant',
            content: '',
            timestamp: new Date()
          };
          set((state) => ({ 
            chatHistory: [...state.chatHistory, assistantMessage] 
          }));

          // Use simple query for now (streaming will be implemented later)
          const response = await api.queryDocument(documentId, question);
          
          // Update the assistant message with the complete response
          set((state) => ({
            chatHistory: state.chatHistory.map((msg, index) => 
              index === state.chatHistory.length - 1 
                ? { ...msg, content: response.answer }
                : msg
            ),
            isQuerying: false
          }));
        } catch (error) {
          // Remove the placeholder assistant message on error
          let errorDetails: ErrorDetails;
          
          if (error instanceof ApiError) {
            try {
              const errorData = JSON.parse(error.message);
              errorDetails = {
                message: errorData.error || 'Query failed',
                code: errorData.code,
                details: errorData.details
              };
            } catch {
              errorDetails = {
                message: 'Query failed',
                details: error.message
              };
            }
          } else {
            errorDetails = {
              message: 'Query failed. Please try again.',
              details: error instanceof Error ? error.message : 'Unknown error'
            };
          }

          set((state) => ({
            chatHistory: state.chatHistory.slice(0, -1),
            error: errorDetails,
            isQuerying: false
          }));
        }
      },

      // Streaming query method (for future use)
      streamQuery: async (question: string) => {
        const { documentId } = get();
        if (!documentId) return;

        try {
          set({ isQuerying: true, error: null });
          
          // Add user message immediately
          const userMessage: ChatMessage = {
            role: 'user',
            content: question,
            timestamp: new Date()
          };
          set((state) => ({ 
            chatHistory: [...state.chatHistory, userMessage] 
          }));

          // Add placeholder assistant message for streaming
          const assistantMessage: ChatMessage = {
            role: 'assistant',
            content: '',
            timestamp: new Date()
          };
          set((state) => ({ 
            chatHistory: [...state.chatHistory, assistantMessage] 
          }));

          let accumulatedContent = '';

          await api.streamQuery(
            documentId,
            question,
            (chunk: string) => {
              // Update the last message with accumulated content
              accumulatedContent += chunk;
              set((state) => ({
                chatHistory: state.chatHistory.map((msg, index) => 
                  index === state.chatHistory.length - 1 
                    ? { ...msg, content: accumulatedContent }
                    : msg
                )
              }));
            },
            () => {
              // Stream complete
              set({ isQuerying: false });
            },
            (error: string) => {
              // Stream error
              set((state) => ({
                chatHistory: state.chatHistory.slice(0, -1), // Remove placeholder
                error: {
                  message: 'Query failed',
                  details: error
                },
                isQuerying: false
              }));
            }
          );
        } catch (error) {
          let errorDetails: ErrorDetails;
          
          if (error instanceof ApiError) {
            try {
              const errorData = JSON.parse(error.message);
              errorDetails = {
                message: errorData.error || 'Query failed',
                code: errorData.code,
                details: errorData.details
              };
            } catch {
              errorDetails = {
                message: 'Query failed',
                details: error.message
              };
            }
          } else {
            errorDetails = {
              message: 'Query failed. Please try again.',
              details: error instanceof Error ? error.message : 'Unknown error'
            };
          }

          set((state) => ({
            chatHistory: state.chatHistory.slice(0, -1), // Remove placeholder
            error: errorDetails,
            isQuerying: false
          }));
        }
      }
    }),
    {
      name: 'document-store',
      partialize: (state) => ({
        documentId: state.documentId,
        filename: state.filename,
        rawText: state.rawText,
        summary: state.summary,
        status: state.status,
        chatHistory: state.chatHistory,
      }),
    }
  )
);