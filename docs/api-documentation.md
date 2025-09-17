# StepFlow API Documentation

## Overview

The StepFlow API provides programmatic access to all platform features, enabling developers to integrate StepFlow functionality into their applications, automate workflows, and build custom solutions.

## Base URL
```
Production: https://api.stepflow.com/v1
Staging: https://staging-api.stepflow.com/v1
```

## Authentication

### API Key Authentication
```http
Authorization: Bearer YOUR_API_KEY
```

### JWT Token Authentication
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

## Rate Limiting

- **Free Plan**: 100 requests per hour
- **Pro Plan**: 1,000 requests per hour  
- **Enterprise Plan**: 10,000 requests per hour

Rate limit headers are included in all responses:
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

## Endpoints

### Authentication

#### POST /auth/login
Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "refresh_token_here",
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe"
    }
  }
}
```

#### POST /auth/refresh
Refresh JWT token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "refresh_token_here"
}
```

### Users

#### GET /users/profile
Get current user profile.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user_id",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "planType": "pro",
    "createdAt": "2023-01-01T00:00:00Z"
  }
}
```

#### PUT /users/profile
Update user profile.

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "preferences": {
    "defaultVoice": "en-US-female-1",
    "autoGenerateNarration": true
  }
}
```

### Recordings

#### POST /recordings
Create a new recording session.

**Request Body:**
```json
{
  "title": "My Recording",
  "description": "Recording description",
  "metadata": {
    "browserInfo": "Chrome 96.0.4664.110",
    "screenResolution": "1920x1080"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "recording_id",
    "uploadUrl": "https://upload.stepflow.com/...",
    "sessionToken": "session_token"
  }
}
```

#### GET /recordings
List user recordings.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `search`: Search term
- `status`: Filter by status (processing, completed, failed)

**Response:**
```json
{
  "success": true,
  "data": {
    "recordings": [
      {
        "id": "recording_id",
        "title": "My Recording",
        "duration": 120,
        "status": "completed",
        "createdAt": "2023-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "totalPages": 3
    }
  }
}
```

#### GET /recordings/:id
Get recording details.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "recording_id",
    "title": "My Recording",
    "description": "Recording description",
    "duration": 120,
    "fileUrl": "https://cdn.stepflow.com/recordings/...",
    "thumbnailUrl": "https://cdn.stepflow.com/thumbnails/...",
    "steps": [
      {
        "id": "step_id",
        "timestamp": 5.2,
        "action": "click",
        "coordinates": { "x": 100, "y": 200 },
        "screenshotUrl": "https://cdn.stepflow.com/screenshots/..."
      }
    ],
    "status": "completed",
    "createdAt": "2023-01-01T00:00:00Z"
  }
}
```

### Guides

#### POST /guides
Create a guide from a recording.

**Request Body:**
```json
{
  "recordingId": "recording_id",
  "title": "My Guide",
  "description": "Guide description",
  "options": {
    "generateNarration": true,
    "voiceId": "en-US-female-1",
    "language": "en"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "guide_id",
    "status": "processing",
    "estimatedCompletion": "2023-01-01T00:05:00Z"
  }
}
```

#### GET /guides
List user guides.

**Query Parameters:**
- `page`: Page number
- `limit`: Items per page
- `search`: Search term
- `category`: Filter by category
- `tags`: Filter by tags (comma-separated)
- `status`: Filter by status

**Response:**
```json
{
  "success": true,
  "data": {
    "guides": [
      {
        "id": "guide_id",
        "title": "My Guide",
        "description": "Guide description",
        "thumbnailUrl": "https://cdn.stepflow.com/thumbnails/...",
        "stepCount": 8,
        "viewCount": 42,
        "status": "published",
        "createdAt": "2023-01-01T00:00:00Z",
        "updatedAt": "2023-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 25,
      "totalPages": 2
    }
  }
}
```

#### GET /guides/:id
Get guide details.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "guide_id",
    "title": "My Guide",
    "description": "Guide description",
    "steps": [
      {
        "id": "step_id",
        "order": 1,
        "title": "Click the login button",
        "description": "Navigate to the login page and click the login button",
        "screenshotUrl": "https://cdn.stepflow.com/screenshots/...",
        "audioUrl": "https://cdn.stepflow.com/audio/...",
        "annotations": [
          {
            "type": "highlight",
            "coordinates": { "x": 100, "y": 200, "width": 80, "height": 30 },
            "color": "#ff0000"
          }
        ]
      }
    ],
    "settings": {
      "theme": "default",
      "brandColors": ["#007bff", "#6c757d"],
      "showStepNumbers": true,
      "autoPlay": false
    },
    "sharing": {
      "isPublic": true,
      "shareUrl": "https://stepflow.com/guides/share/...",
      "embedCode": "<iframe src=\"...\"></iframe>"
    },
    "analytics": {
      "viewCount": 42,
      "completionRate": 0.85,
      "averageTimeSpent": 180
    }
  }
}
```

#### PUT /guides/:id
Update guide.

**Request Body:**
```json
{
  "title": "Updated Guide Title",
  "description": "Updated description",
  "steps": [
    {
      "id": "step_id",
      "title": "Updated step title",
      "description": "Updated step description"
    }
  ],
  "settings": {
    "theme": "dark",
    "autoPlay": true
  }
}
```

### Sharing

#### POST /guides/:id/sharing
Update guide sharing settings.

**Request Body:**
```json
{
  "isPublic": true,
  "allowedDomains": ["example.com", "*.company.com"],
  "passwordProtected": false,
  "expiresAt": "2023-12-31T23:59:59Z"
}
```

#### POST /guides/:id/permissions
Grant access to specific users.

**Request Body:**
```json
{
  "permissions": [
    {
      "email": "user@example.com",
      "role": "editor"
    },
    {
      "userId": "user_id_2",
      "role": "viewer"
    }
  ]
}
```

### Analytics

#### GET /guides/:id/analytics
Get guide analytics.

**Query Parameters:**
- `startDate`: Start date (ISO 8601)
- `endDate`: End date (ISO 8601)
- `granularity`: Data granularity (hour, day, week, month)

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalViews": 156,
      "uniqueViewers": 89,
      "completionRate": 0.72,
      "averageTimeSpent": 245
    },
    "timeSeries": [
      {
        "date": "2023-01-01",
        "views": 12,
        "completions": 8
      }
    ],
    "stepAnalytics": [
      {
        "stepId": "step_1",
        "viewCount": 156,
        "dropoffRate": 0.05
      }
    ]
  }
}
```

### AI Enhancement

#### POST /guides/:id/enhance
Apply AI enhancements to a guide.

**Request Body:**
```json
{
  "enhancements": ["summarize", "translate", "improve_quality"],
  "options": {
    "targetLanguage": "es",
    "summaryLength": "short"
  }
}
```

#### POST /guides/:id/generate-formats
Generate alternative formats.

**Request Body:**
```json
{
  "formats": ["pdf", "video", "article"],
  "options": {
    "videoQuality": "1080p",
    "pdfLayout": "portrait"
  }
}
```

## Webhooks

### Setup
Configure webhook endpoints in your account settings or via API:

```http
POST /webhooks
{
  "url": "https://your-app.com/webhooks/stepflow",
  "events": ["guide.completed", "recording.processed"],
  "secret": "your_webhook_secret"
}
```

### Events

#### guide.completed
Triggered when guide generation is completed.

```json
{
  "event": "guide.completed",
  "data": {
    "guideId": "guide_id",
    "status": "completed",
    "completedAt": "2023-01-01T00:05:00Z"
  },
  "timestamp": "2023-01-01T00:05:01Z"
}
```

#### recording.processed
Triggered when recording processing is completed.

```json
{
  "event": "recording.processed",
  "data": {
    "recordingId": "recording_id",
    "status": "completed",
    "stepCount": 8,
    "duration": 120
  },
  "timestamp": "2023-01-01T00:03:00Z"
}
```

## Error Handling

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {
      "field": "email",
      "issue": "Invalid email format"
    },
    "timestamp": "2023-01-01T00:00:00Z",
    "requestId": "req_123456"
  }
}
```

### Common Error Codes
- `AUTHENTICATION_FAILED`: Invalid credentials
- `AUTHORIZATION_DENIED`: Insufficient permissions
- `VALIDATION_ERROR`: Invalid request data
- `RESOURCE_NOT_FOUND`: Requested resource doesn't exist
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `QUOTA_EXCEEDED`: Usage quota exceeded
- `PROCESSING_ERROR`: Server processing error

## SDKs and Libraries

### JavaScript/Node.js
```bash
npm install @stepflow/sdk
```

```javascript
import { StepFlowClient } from '@stepflow/sdk';

const client = new StepFlowClient({
  apiKey: 'your_api_key',
  environment: 'production' // or 'staging'
});

// Create a guide
const guide = await client.guides.create({
  recordingId: 'recording_id',
  title: 'My Guide'
});
```

### Python
```bash
pip install stepflow-python
```

```python
from stepflow import StepFlowClient

client = StepFlowClient(api_key='your_api_key')

# List guides
guides = client.guides.list(limit=10)
```

### cURL Examples

#### Create Recording
```bash
curl -X POST https://api.stepflow.com/v1/recordings \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My Recording",
    "description": "API test recording"
  }'
```

#### Get Guide
```bash
curl -X GET https://api.stepflow.com/v1/guides/guide_id \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## Support

- **API Documentation**: https://docs.stepflow.com/api
- **Developer Forum**: https://community.stepflow.com/developers
- **Support Email**: api-support@stepflow.com
- **Status Page**: https://status.stepflow.com

---

*API Version: v1*
*Last Updated: [Current Date]*