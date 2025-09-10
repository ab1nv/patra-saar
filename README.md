# PatraSaar

PatraSaar is a web application that specializes in summarizing Indian legal documents and making complex legal jargon accessible to ordinary people. The platform provides secure document upload, automated text extraction, AI-powered summarization, and an interactive Q&A interface.

## Features

- **Secure File Upload**: Support for .txt, .pdf, and .docx files with validation
- **Text Extraction**: Automated extraction from various document formats
- **AI-Powered Summarization**: Generate clear, simple summaries of legal documents
- **Interactive Q&A**: Ask questions about uploaded documents and get explanations
- **Real-time Processing**: Background task processing with status updates
- **Responsive Design**: Modern, mobile-friendly interface built with Next.js and shadcn/ui

## Architecture

PatraSaar follows a modern microservices architecture:

- **Frontend**: Next.js 15 with TypeScript, Tailwind CSS, and shadcn/ui components
- **Backend**: Go with Gin web framework for high-performance API
- **Database**: PostgreSQL for reliable data storage
- **Task Queue**: Redis with Asynq for background job processing
- **AI Integration**: Fine-tuned GPT model for legal document analysis

## API Endpoints

### Document Management

#### Upload Document
```http
POST /api/upload
Content-Type: multipart/form-data

Form Data:
- file: Document file (.txt, .pdf, .docx)

Response:
{
  "document_id": "uuid",
  "filename": "document.pdf",
  "raw_text": "extracted text content"
}
```

#### Get Document Status
```http
GET /api/documents/{id}/status

Response:
{
  "status": "PENDING|PROCESSING|COMPLETED|FAILED",
  "summary": "generated summary (if completed)"
}
```

#### Get Document Details
```http
GET /api/documents/{id}

Response:
{
  "id": "uuid",
  "filename": "document.pdf",
  "raw_text": "extracted text",
  "summary": "generated summary",
  "status": "COMPLETED",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z",
  "file_size": 1024,
  "content_type": "application/pdf"
}
```

### Q&A Interface

#### Query Document
```http
POST /api/documents/{id}/query
Content-Type: application/json

{
  "question": "What are the main obligations in this contract?"
}

Response:
{
  "answer": "Based on the document, the main obligations are..."
}
```

#### Stream Query (Real-time)
```http
GET /api/documents/{id}/query/stream?question=your+question

Response: Server-Sent Events stream
```

### Health and Monitoring

#### Health Check
```http
GET /health

Response:
{
  "status": "healthy|unhealthy",
  "timestamp": "2024-01-01T00:00:00Z",
  "version": "1.0.0",
  "services": {
    "database": "healthy",
    "redis": "healthy"
  },
  "uptime": "1h30m45s"
}
```

#### Readiness Check
```http
GET /ready

Response:
{
  "status": "ready|not ready"
}
```

#### Metrics
```http
GET /api/metrics

Response:
{
  "RequestCount": {...},
  "RequestDuration": {...},
  "ErrorCount": {...}
}
```

## Database Schema

### Documents Table
```sql
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename TEXT NOT NULL,
    raw_text TEXT NOT NULL,
    summary TEXT,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    file_size INTEGER NOT NULL,
    content_type VARCHAR(100) NOT NULL
);
```

### Chat Sessions Table (Optional)
```sql
CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    messages JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Installation

### Prerequisites

- Node.js 18+ and pnpm
- Go 1.21+
- PostgreSQL 15+
- Redis 7+
- Docker (optional)

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/patrasaar.git
   cd patrasaar
   ```

2. **Install dependencies**
   ```bash
   make install
   ```

3. **Set up environment variables**
   ```bash
   # Copy example environment files
   cp frontend/.env.example frontend/.env.local
   cp backend/.env.example backend/.env
   
   # Edit the files with your configuration
   ```

4. **Set up the database**
   ```bash
   # Start PostgreSQL and Redis (if using Docker)
   docker-compose up -d postgres redis
   
   # Run database migrations
   make db-migrate
   ```

5. **Start the development environment**
   ```bash
   make run
   ```

   This will start:
   - Frontend at http://localhost:3000
   - Backend API at http://localhost:8080
   - Background worker for document processing

### Docker Setup

1. **Build and run with Docker Compose**
   ```bash
   docker-compose up --build
   ```

2. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8080
   - Health check: http://localhost:8080/health

## Development

### Available Commands

```bash
# Development
make dev-setup    # Set up development environment
make run          # Start all services with hot reloading
make restart      # Restart all services
make status       # Show service status

# Testing
make test         # Run all tests
make test-coverage # Run tests with coverage

# Building
make build        # Build all components
make clean        # Clean build artifacts

# Database
make db-migrate   # Run database migrations
make db-reset     # Reset and re-migrate database

# Utilities
make lint         # Run linters
make logs         # Show recent logs
make ps           # Show running processes
make kill         # Stop all development processes
```

### Project Structure

```
patrasaar/
├── frontend/                 # Next.js application
│   ├── src/
│   │   ├── app/             # App Router pages
│   │   ├── components/      # React components
│   │   ├── lib/            # Utilities and API client
│   │   └── stores/         # Zustand stores
│   └── public/             # Static assets
├── backend/                 # Go application
│   ├── cmd/
│   │   ├── api/            # API server
│   │   └── worker/         # Background worker
│   ├── internal/
│   │   ├── handlers/       # HTTP handlers
│   │   ├── services/       # Business logic
│   │   ├── models/         # Data models
│   │   └── middleware/     # HTTP middleware
│   └── pkg/                # Shared packages
├── database/               # Database schemas and migrations
├── docker/                 # Docker configurations
├── .github/workflows/      # CI/CD pipelines
├── config/                 # Application configuration
└── Makefile               # Development commands
```

### Configuration

The application uses a YAML configuration file at `config/app.yaml`:

```yaml
app:
  name: "PatraSaar"
  version: "1.0.0"
  environment: "development"

server:
  host: "localhost"
  port: 8080
  read_timeout: "30s"
  write_timeout: "30s"

database:
  host: "localhost"
  port: 5432
  name: "patrasaar"
  user: "postgres"
  password: "postgres"

file_processing:
  max_file_size_mb: 50
  max_pdf_pages: 100
  allowed_extensions: [".txt", ".pdf", ".docx"]

ai_service:
  endpoint: "http://localhost:8000"
  timeout: "120s"
  max_retries: 3

security:
  cors_origins: ["http://localhost:3000"]
  rate_limit_requests_per_minute: 100
```

## Testing

### Frontend Tests
```bash
cd frontend
pnpm run test              # Run tests
pnpm run test:watch        # Run tests in watch mode
pnpm run test:coverage     # Run tests with coverage
```

### Backend Tests
```bash
cd backend
go test ./...              # Run all tests
go test -cover ./...       # Run tests with coverage
go test -v ./...           # Run tests with verbose output
```

### Integration Tests
```bash
make test                  # Run all tests (frontend + backend)
```

## Deployment

### Production Build

1. **Build the application**
   ```bash
   make build
   ```

2. **Build Docker images**
   ```bash
   docker build -f docker/Dockerfile.frontend -t patrasaar-frontend .
   docker build -f docker/Dockerfile.backend -t patrasaar-backend .
   ```

3. **Deploy with Docker Compose**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

### Environment Variables

#### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:8080/api
```

#### Backend (.env)
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=patrasaar
DB_USER=postgres
DB_PASSWORD=postgres
REDIS_HOST=localhost
REDIS_PORT=6379
AI_SERVICE_ENDPOINT=http://localhost:8000
```

## Security

PatraSaar implements several security measures:

- **Input Validation**: File type and size validation
- **Rate Limiting**: API endpoint protection
- **CORS Configuration**: Restricted cross-origin requests
- **SQL Injection Prevention**: Parameterized queries
- **Error Handling**: Secure error responses
- **Dependency Scanning**: Automated vulnerability checks

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style and conventions
- Write tests for new features
- Update documentation as needed
- Ensure all CI checks pass

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions:

- Create an issue on GitHub
- Check the documentation
- Review existing issues and discussions

## Roadmap

- [ ] Enhanced AI model fine-tuning for Indian legal documents
- [ ] Multi-language support (Hindi, regional languages)
- [ ] Document comparison features
- [ ] Advanced search and filtering
- [ ] User authentication and document management
- [ ] Mobile application
- [ ] Integration with legal databases