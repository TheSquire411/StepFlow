"""
API routes for AI Processor service
"""

import uuid
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, Request, BackgroundTasks
from loguru import logger

from ..models.schemas import (
    StepDetectionRequest,
    OCRRequest,
    ContentGenerationRequest,
    VoiceSynthesisRequest,
    ImageAnalysisRequest,
    TaskResult,
    QueueStatus,
    HealthStatus
)

router = APIRouter()


@router.post("/tasks/step-detection", response_model=Dict[str, str])
async def submit_step_detection_task(
    request: StepDetectionRequest,
    app_request: Request
):
    """Submit a step detection task"""
    try:
        # Generate unique task ID
        task_id = str(uuid.uuid4())
        
        # Prepare task data
        task_data = {
            "task_id": task_id,
            "task_type": request.task_type.value,
            "screenshot_url": str(request.screenshot_url),
            "previous_screenshot_url": str(request.previous_screenshot_url) if request.previous_screenshot_url else None,
            "session_context": request.session_context,
            "priority": request.priority,
            "metadata": request.metadata
        }
        
        # Submit to queue
        queue_service = app_request.app.state.queue
        await queue_service.submit_task(task_data)
        
        return {"task_id": task_id, "status": "submitted"}
        
    except Exception as e:
        logger.error(f"Error submitting step detection task: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/tasks/ocr", response_model=Dict[str, str])
async def submit_ocr_task(
    request: OCRRequest,
    app_request: Request
):
    """Submit an OCR extraction task"""
    try:
        task_id = str(uuid.uuid4())
        
        task_data = {
            "task_id": task_id,
            "task_type": request.task_type.value,
            "image_url": str(request.image_url),
            "languages": request.languages,
            "extract_regions": request.extract_regions,
            "priority": request.priority,
            "metadata": request.metadata
        }
        
        queue_service = app_request.app.state.queue
        await queue_service.submit_task(task_data)
        
        return {"task_id": task_id, "status": "submitted"}
        
    except Exception as e:
        logger.error(f"Error submitting OCR task: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/tasks/content-generation", response_model=Dict[str, str])
async def submit_content_generation_task(
    request: ContentGenerationRequest,
    app_request: Request
):
    """Submit a content generation task"""
    try:
        task_id = str(uuid.uuid4())
        
        task_data = {
            "task_id": task_id,
            "task_type": request.task_type.value,
            "prompt": request.prompt,
            "content_type": request.content_type,
            "context": request.context,
            "max_length": request.max_length,
            "priority": request.priority,
            "metadata": request.metadata
        }
        
        queue_service = app_request.app.state.queue
        await queue_service.submit_task(task_data)
        
        return {"task_id": task_id, "status": "submitted"}
        
    except Exception as e:
        logger.error(f"Error submitting content generation task: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/tasks/voice-synthesis", response_model=Dict[str, str])
async def submit_voice_synthesis_task(
    request: VoiceSynthesisRequest,
    app_request: Request
):
    """Submit a voice synthesis task"""
    try:
        task_id = str(uuid.uuid4())
        
        task_data = {
            "task_id": task_id,
            "task_type": request.task_type.value,
            "text": request.text,
            "voice_id": request.voice_id,
            "voice_settings": request.voice_settings,
            "priority": request.priority,
            "metadata": request.metadata
        }
        
        queue_service = app_request.app.state.queue
        await queue_service.submit_task(task_data)
        
        return {"task_id": task_id, "status": "submitted"}
        
    except Exception as e:
        logger.error(f"Error submitting voice synthesis task: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/tasks/image-analysis", response_model=Dict[str, str])
async def submit_image_analysis_task(
    request: ImageAnalysisRequest,
    app_request: Request
):
    """Submit an image analysis task"""
    try:
        task_id = str(uuid.uuid4())
        
        task_data = {
            "task_id": task_id,
            "task_type": request.task_type.value,
            "image_url": str(request.image_url),
            "analysis_types": request.analysis_types,
            "priority": request.priority,
            "metadata": request.metadata
        }
        
        queue_service = app_request.app.state.queue
        await queue_service.submit_task(task_data)
        
        return {"task_id": task_id, "status": "submitted"}
        
    except Exception as e:
        logger.error(f"Error submitting image analysis task: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tasks/{task_id}", response_model=TaskResult)
async def get_task_result(task_id: str, app_request: Request):
    """Get the result of a task"""
    try:
        queue_service = app_request.app.state.queue
        result = await queue_service.get_task_result(task_id)
        
        if not result:
            raise HTTPException(status_code=404, detail="Task not found")
        
        return TaskResult(
            task_id=task_id,
            status=result.get("status", "unknown"),
            result=result.get("result"),
            error=result.get("error"),
            processing_time=result.get("processing_time"),
            created_at=result.get("created_at", ""),
            completed_at=result.get("completed_at")
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting task result: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/queue/status", response_model=QueueStatus)
async def get_queue_status(app_request: Request):
    """Get queue status and statistics"""
    try:
        queue_service = app_request.app.state.queue
        stats = await queue_service.get_queue_stats()
        
        # Calculate totals
        total_tasks = sum(queue["pending_tasks"] for queue in stats.values() if isinstance(queue, dict))
        
        return QueueStatus(
            total_tasks=total_tasks,
            pending_tasks=total_tasks,
            processing_tasks=0,  # Would need to track this separately
            completed_tasks=0,   # Would need to track this separately
            failed_tasks=0,      # Would need to track this separately
            workers_active=stats.get("active_workers", 0)
        )
        
    except Exception as e:
        logger.error(f"Error getting queue status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/voices")
async def get_available_voices(app_request: Request):
    """Get list of available voices for synthesis"""
    try:
        # This would get voices from the voice synthesis service
        # For now, return a placeholder
        return {
            "voices": [
                {
                    "voice_id": "21m00Tcm4TlvDq8ikWAM",
                    "name": "Rachel",
                    "category": "premade",
                    "description": "Young American female voice"
                },
                {
                    "voice_id": "AZnzlk1XvdvUeBnXmlld",
                    "name": "Domi",
                    "category": "premade", 
                    "description": "Young American female voice"
                }
            ]
        }
        
    except Exception as e:
        logger.error(f"Error getting available voices: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health/detailed", response_model=HealthStatus)
async def get_detailed_health(app_request: Request):
    """Get detailed health status"""
    try:
        queue_service = app_request.app.state.queue
        stats = await queue_service.get_queue_stats()
        
        total_tasks = sum(queue["pending_tasks"] for queue in stats.values() if isinstance(queue, dict))
        
        queue_status = QueueStatus(
            total_tasks=total_tasks,
            pending_tasks=total_tasks,
            processing_tasks=0,
            completed_tasks=0,
            failed_tasks=0,
            workers_active=stats.get("active_workers", 0)
        )
        
        return HealthStatus(
            status="healthy",
            service="ai-processor",
            version="1.0.0",
            uptime=0.0,  # Would calculate actual uptime
            queue_status=queue_status
        )
        
    except Exception as e:
        logger.error(f"Error getting detailed health: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/tasks/batch")
async def submit_batch_tasks(
    tasks: list[Dict[str, Any]],
    app_request: Request
):
    """Submit multiple tasks in batch"""
    try:
        queue_service = app_request.app.state.queue
        task_ids = []
        
        for task_data in tasks:
            task_id = str(uuid.uuid4())
            task_data["task_id"] = task_id
            
            await queue_service.submit_task(task_data)
            task_ids.append(task_id)
        
        return {
            "submitted_tasks": len(task_ids),
            "task_ids": task_ids,
            "status": "batch_submitted"
        }
        
    except Exception as e:
        logger.error(f"Error submitting batch tasks: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/tasks/{task_id}")
async def cancel_task(task_id: str, app_request: Request):
    """Cancel a pending task"""
    try:
        # This would implement task cancellation
        # For now, just return success
        return {"task_id": task_id, "status": "cancelled"}
        
    except Exception as e:
        logger.error(f"Error cancelling task: {e}")
        raise HTTPException(status_code=500, detail=str(e))