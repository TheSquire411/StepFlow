"""
Pydantic models for API requests and responses
"""

from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field, HttpUrl
from enum import Enum


class ProcessingStatus(str, Enum):
    """Processing status enumeration"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class TaskType(str, Enum):
    """Task type enumeration"""
    STEP_DETECTION = "step_detection"
    OCR_EXTRACTION = "ocr_extraction"
    CONTENT_GENERATION = "content_generation"
    VOICE_SYNTHESIS = "voice_synthesis"
    IMAGE_ANALYSIS = "image_analysis"


# Base models
class BaseTask(BaseModel):
    """Base task model"""
    task_id: str = Field(..., description="Unique task identifier")
    task_type: TaskType = Field(..., description="Type of processing task")
    priority: int = Field(default=1, ge=1, le=10, description="Task priority (1-10)")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")


class TaskResult(BaseModel):
    """Task result model"""
    task_id: str
    status: ProcessingStatus
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    processing_time: Optional[float] = None
    created_at: str
    completed_at: Optional[str] = None


# Step Detection models
class StepDetectionRequest(BaseTask):
    """Step detection request model"""
    task_type: TaskType = TaskType.STEP_DETECTION
    screenshot_url: HttpUrl = Field(..., description="URL to screenshot image")
    previous_screenshot_url: Optional[HttpUrl] = Field(None, description="Previous screenshot for comparison")
    session_context: Dict[str, Any] = Field(default_factory=dict, description="Session context information")


class DetectedStep(BaseModel):
    """Detected step model"""
    action: str = Field(..., description="Detected action type")
    element: Optional[str] = Field(None, description="Target element selector")
    coordinates: Optional[Dict[str, float]] = Field(None, description="Click coordinates")
    text: Optional[str] = Field(None, description="Associated text")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Detection confidence")
    bounding_box: Optional[Dict[str, float]] = Field(None, description="Element bounding box")
    description: str = Field(..., description="Human-readable description")


class StepDetectionResult(BaseModel):
    """Step detection result model"""
    detected_steps: List[DetectedStep]
    screenshot_analysis: Dict[str, Any]
    processing_metadata: Dict[str, Any]


# OCR models
class OCRRequest(BaseTask):
    """OCR extraction request model"""
    task_type: TaskType = TaskType.OCR_EXTRACTION
    image_url: HttpUrl = Field(..., description="URL to image for OCR")
    languages: List[str] = Field(default=["en"], description="OCR languages")
    extract_regions: Optional[List[Dict[str, float]]] = Field(None, description="Specific regions to extract")


class OCRResult(BaseModel):
    """OCR extraction result model"""
    extracted_text: str
    text_regions: List[Dict[str, Any]]
    confidence_scores: List[float]
    language_detected: str


# Content Generation models
class ContentGenerationRequest(BaseTask):
    """Content generation request model"""
    task_type: TaskType = TaskType.CONTENT_GENERATION
    prompt: str = Field(..., description="Generation prompt")
    content_type: str = Field(..., description="Type of content to generate")
    context: Dict[str, Any] = Field(default_factory=dict, description="Additional context")
    max_length: Optional[int] = Field(None, description="Maximum content length")


class ContentGenerationResult(BaseModel):
    """Content generation result model"""
    generated_content: str
    content_type: str
    generation_metadata: Dict[str, Any]


# Voice Synthesis models
class VoiceSynthesisRequest(BaseTask):
    """Voice synthesis request model"""
    task_type: TaskType = TaskType.VOICE_SYNTHESIS
    text: str = Field(..., description="Text to synthesize")
    voice_id: Optional[str] = Field(None, description="Voice ID for synthesis")
    voice_settings: Dict[str, Any] = Field(default_factory=dict, description="Voice configuration")


class VoiceSynthesisResult(BaseModel):
    """Voice synthesis result model"""
    audio_url: str
    duration: float
    voice_metadata: Dict[str, Any]


# Image Analysis models
class ImageAnalysisRequest(BaseTask):
    """Image analysis request model"""
    task_type: TaskType = TaskType.IMAGE_ANALYSIS
    image_url: HttpUrl = Field(..., description="URL to image for analysis")
    analysis_types: List[str] = Field(..., description="Types of analysis to perform")


class ImageAnalysisResult(BaseModel):
    """Image analysis result model"""
    analysis_results: Dict[str, Any]
    detected_objects: List[Dict[str, Any]]
    image_metadata: Dict[str, Any]


# Queue models
class QueueStatus(BaseModel):
    """Queue status model"""
    total_tasks: int
    pending_tasks: int
    processing_tasks: int
    completed_tasks: int
    failed_tasks: int
    workers_active: int


# Health check model
class HealthStatus(BaseModel):
    """Health status model"""
    status: str
    service: str
    version: str
    uptime: float
    queue_status: Optional[QueueStatus] = None