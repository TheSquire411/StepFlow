# StepFlow AI Processor

The AI Processor is a Python-based microservice that handles AI-powered tasks for the StepFlow platform, including:

- **Step Detection**: Computer vision analysis of screenshots to detect user interactions
- **OCR Extraction**: Text extraction from images using optical character recognition
- **Content Generation**: AI-powered content creation using OpenAI GPT
- **Voice Synthesis**: Text-to-speech conversion using ElevenLabs
- **Image Analysis**: Computer vision analysis for object detection, face detection, etc.

## Features

- **Asynchronous Processing**: Built with FastAPI and asyncio for high performance
- **Queue Management**: Redis-based task queuing with priority support
- **Scalable Workers**: Multiple worker processes for parallel task execution
- **Health Monitoring**: Comprehensive health checks and monitoring endpoints
- **Error Handling**: Robust error handling and retry mechanisms

## Installation

### Prerequisites

- Python 3.11+
- Redis server
- OpenAI API key (for content generation)
- ElevenLabs API key (for voice synthesis)

### Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Start the service:
```bash
python main.py
```

## API Endpoints

### Task Submission

- `POST /api/v1/tasks/step-detection` - Submit step detection task
- `POST /api/v1/tasks/ocr` - Submit OCR extraction task
- `POST /api/v1/tasks/content-generation` - Submit content generation task
- `POST /api/v1/tasks/voice-synthesis` - Submit voice synthesis task
- `POST /api/v1/tasks/image-analysis` - Submit image analysis task
- `POST /api/v1/tasks/batch` - Submit multiple tasks in batch

### Task Management

- `GET /api/v1/tasks/{task_id}` - Get task result
- `DELETE /api/v1/tasks/{task_id}` - Cancel task

### Monitoring

- `GET /health` - Basic health check
- `GET /api/v1/health/detailed` - Detailed health status
- `GET /api/v1/queue/status` - Queue statistics

### Utilities

- `GET /api/v1/voices` - Get available voices for synthesis

## Configuration

Key configuration options in `.env`:

```bash
# Server
HOST=0.0.0.0
PORT=8000

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# AI Services
OPENAI_API_KEY=your-key
ELEVENLABS_API_KEY=your-key

# Processing
MAX_WORKERS=4
PROCESSING_TIMEOUT=300
```

## Docker Deployment

Build and run with Docker:

```bash
# Build image
docker build -f ../../Dockerfile.ai-processor -t stepflow/ai-processor .

# Run container
docker run -p 8000:8000 --env-file .env stepflow/ai-processor
```

## Development

### Running Tests

```bash
pytest tests/
```

### Code Formatting

```bash
black src/
flake8 src/
```

### Adding New AI Services

1. Create service class in `src/services/`
2. Implement `process()` method
3. Add to task handlers in `queue_service.py`
4. Add API endpoint in `routes.py`
5. Update schemas in `models/schemas.py`

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   FastAPI App   │    │  Queue Service  │    │  Redis Queue    │
│                 │────│                 │────│                 │
│  - API Routes   │    │  - Workers      │    │  - Task Storage │
│  - Validation   │    │  - Scheduling   │    │  - Results      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│  AI Services    │    │  External APIs  │
│                 │    │                 │
│  - Step Det.    │    │  - OpenAI       │
│  - OCR          │    │  - ElevenLabs   │
│  - Content Gen. │    │  - AWS S3       │
│  - Voice Synth. │    │                 │
│  - Image Anal.  │    │                 │
└─────────────────┘    └─────────────────┘
```

## Performance

- **Throughput**: ~100 tasks/minute per worker
- **Latency**: 1-30 seconds depending on task type
- **Memory**: ~500MB base + ~100MB per worker
- **CPU**: Scales with number of workers

## Monitoring

The service provides comprehensive monitoring:

- Health check endpoints
- Queue statistics
- Task completion metrics
- Error tracking
- Performance metrics

## Security

- API key validation for external services
- Input validation and sanitization
- Rate limiting (configured at load balancer)
- Secure file handling
- No sensitive data logging