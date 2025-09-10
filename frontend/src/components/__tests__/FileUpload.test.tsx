import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileUpload } from '../FileUpload';
import { useDocumentStore } from '@/stores/useDocumentStore';

// Mock the store
jest.mock('@/stores/useDocumentStore');
const mockUseDocumentStore = useDocumentStore as jest.MockedFunction<typeof useDocumentStore>;

// Mock file for testing
const createMockFile = (name: string, size: number, type: string) => {
  const file = new File(['test content'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

describe('FileUpload Component', () => {
  const mockUploadDocument = jest.fn();
  const mockSetError = jest.fn();

  beforeEach(() => {
    mockUseDocumentStore.mockReturnValue({
      isUploading: false,
      error: null,
      uploadDocument: mockUploadDocument,
      setError: mockSetError,
      // Add other required store properties
      documentId: null,
      filename: '',
      rawText: '',
      summary: null,
      status: 'PENDING',
      chatHistory: [],
      isLoading: false,
      isQuerying: false,
      setDocument: jest.fn(),
      setSummary: jest.fn(),
      setStatus: jest.fn(),
      addChatMessage: jest.fn(),
      setLoading: jest.fn(),
      setUploading: jest.fn(),
      setQuerying: jest.fn(),
      clearDocument: jest.fn(),
      pollDocumentStatus: jest.fn(),
      queryDocument: jest.fn(),
      streamQuery: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders upload component correctly', () => {
    render(<FileUpload />);
    
    expect(screen.getByText('Drop your document here')).toBeInTheDocument();
    expect(screen.getByText('or click to browse files')).toBeInTheDocument();
    expect(screen.getByText('Supports: .txt, .pdf')).toBeInTheDocument();
    expect(screen.getByText('Maximum file size: 50MB')).toBeInTheDocument();
  });

  it('shows loading state when uploading', () => {
    mockUseDocumentStore.mockReturnValue({
      isUploading: true,
      error: null,
      uploadDocument: mockUploadDocument,
      setError: mockSetError,
      documentId: null,
      filename: '',
      rawText: '',
      summary: null,
      status: 'PENDING',
      chatHistory: [],
      isLoading: false,
      isQuerying: false,
      setDocument: jest.fn(),
      setSummary: jest.fn(),
      setStatus: jest.fn(),
      addChatMessage: jest.fn(),
      setLoading: jest.fn(),
      setUploading: jest.fn(),
      setQuerying: jest.fn(),
      clearDocument: jest.fn(),
      pollDocumentStatus: jest.fn(),
      queryDocument: jest.fn(),
      streamQuery: jest.fn(),
    });

    render(<FileUpload />);
    
    expect(screen.getByText('Uploading...')).toBeInTheDocument();
  });

  it('shows error message when there is an error', () => {
    const errorMessage = 'File too large';
    mockUseDocumentStore.mockReturnValue({
      isUploading: false,
      error: { message: 'An error occurred', details: errorMessage },
      uploadDocument: mockUploadDocument,
      setError: mockSetError,
      documentId: null,
      filename: '',
      rawText: '',
      summary: null,
      status: 'PENDING',
      chatHistory: [],
      isLoading: false,
      isQuerying: false,
      setDocument: jest.fn(),
      setSummary: jest.fn(),
      setStatus: jest.fn(),
      addChatMessage: jest.fn(),
      setLoading: jest.fn(),
      setUploading: jest.fn(),
      setQuerying: jest.fn(),
      clearDocument: jest.fn(),
      pollDocumentStatus: jest.fn(),
      queryDocument: jest.fn(),
      streamQuery: jest.fn(),
    });

    render(<FileUpload />);
    
    expect(screen.getByText('An error occurred')).toBeInTheDocument();
  });

  it('validates file type correctly', async () => {
    render(<FileUpload />);
    
    const dropZone = screen.getByText('Drop your document here').closest('div');
    const invalidFile = createMockFile('test.exe', 1000, 'application/exe');
    
    // Simulate dropping an invalid file
    fireEvent.drop(dropZone!, {
      dataTransfer: {
        files: [invalidFile],
        types: ['Files'],
      },
    });
    
    await waitFor(() => {
      expect(mockSetError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'File type not supported',
          details: expect.stringContaining('Please upload a .txt or .pdf file')
        })
      );
    });
  });

  it('validates file size correctly', async () => {
    render(<FileUpload />);
    
    const largeFile = createMockFile('large.pdf', 60 * 1024 * 1024, 'application/pdf'); // 60MB
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    await userEvent.upload(input, largeFile);
    
    expect(mockSetError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'File size too large',
        details: 'File size must be less than 50MB'
      })
    );
  });

  it('uploads valid file successfully', async () => {
    render(<FileUpload />);
    
    const validFile = createMockFile('test.pdf', 1000, 'application/pdf');
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    await userEvent.upload(input, validFile);
    
    expect(mockUploadDocument).toHaveBeenCalledWith(validFile);
  });

  it('handles drag and drop correctly', async () => {
    render(<FileUpload />);
    
    const dropZone = screen.getByText('Drop your document here').closest('div');
    const validFile = createMockFile('test.pdf', 1000, 'application/pdf');
    
    // Simulate drop with valid file
    fireEvent.drop(dropZone!, {
      dataTransfer: {
        files: [validFile],
        types: ['Files'],
      },
    });
    
    await waitFor(() => {
      expect(mockUploadDocument).toHaveBeenCalledWith(validFile);
    });
  });
});