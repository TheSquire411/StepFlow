"""
Queue service for managing AI processing tasks
"""

import asyncio
import time
from typing import Dict, Any, Optional, List
from loguru import logger

from ..config import settings
from ..models.schemas import TaskType, ProcessingStatus
from .redis_service import RedisService
from .step_detection_service import StepDetectionService
from .ocr_service import OCRService
from .content_generation_service import ContentGenerationService
from .voice_synthesis_service import VoiceSynthesisService
from .image_analysis_service import ImageAnalysisService


class QueueService:
    """Queue service for processing AI tasks"""
    
    def __init__(self, redis_service: RedisService):
        self.redis = redis_service
        self.workers: List[asyncio.Task] = []
        self.running = False
        
        # Initialize AI services
        self.step_detection = StepDetectionService()
        self.ocr_service = OCRService()
        self.content_generation = ContentGenerationService()
        self.voice_synthesis = VoiceSynthesisService()
        self.image_analysis = ImageAnalysisService()
        
        # Task type to service mapping
        self.task_handlers = {
            TaskType.STEP_DETECTION: self.step_detection.process,
            TaskType.OCR_EXTRACTION: self.ocr_service.process,
            TaskType.CONTENT_GENERATION: self.content_generation.process,
            TaskType.VOICE_SYNTHESIS: self.voice_synthesis.process,
            TaskType.IMAGE_ANALYSIS: self.image_analysis.process,
        }
    
    async def start_workers(self):
        """Start worker tasks"""
        self.running = True
        
        # Start workers for each task type
        for task_type in TaskType:
            for i in range(settings.MAX_WORKERS):
                worker = asyncio.create_task(
                    self._worker(f"{task_type.value}_{i}", task_type.value)
                )
                self.workers.append(worker)
        
        logger.info(f"Started {len(self.workers)} workers")
    
    async def stop_workers(self):
        """Stop all workers"""
        self.running = False
        
        # Cancel all workers
        for worker in self.workers:
            worker.cancel()
        
        # Wait for workers to finish
        if self.workers:
            await asyncio.gather(*self.workers, return_exceptions=True)
        
        self.workers.clear()
        logger.info("Stopped all workers")
    
    async def _worker(self, worker_id: str, queue_name: str):
        """Worker coroutine for processing tasks"""
        logger.info(f"Worker {worker_id} started for queue {queue_name}")
        
        while self.running:
            try:
                # Get task from queue
                task_data = await self.redis.dequeue_task(queue_name)
                
                if not task_data:
                    # No tasks available, wait a bit
                    await asyncio.sleep(1)
                    continue
                
                # Process the task
                await self._process_task(worker_id, task_data)
                
            except asyncio.CancelledError:
                logger.info(f"Worker {worker_id} cancelled")
                break
            except Exception as e:
                logger.error(f"Worker {worker_id} error: {e}")
                await asyncio.sleep(5)  # Wait before retrying
        
        logger.info(f"Worker {worker_id} stopped")
    
    async def _process_task(self, worker_id: str, task_data: Dict[str, Any]):
        """Process a single task"""
        task_id = task_data.get("task_id")
        task_type = task_data.get("task_type")
        
        logger.info(f"Worker {worker_id} processing task {task_id} ({task_type})")
        
        try:
            # Set task status to processing
            await self.redis.set_task_status(task_id, ProcessingStatus.PROCESSING)
            
            # Get the appropriate handler
            handler = self.task_handlers.get(TaskType(task_type))
            if not handler:
                raise ValueError(f"No handler for task type: {task_type}")
            
            # Process the task with timeout
            start_time = time.time()
            result = await asyncio.wait_for(
                handler(task_data),
                timeout=settings.PROCESSING_TIMEOUT
            )
            processing_time = time.time() - start_time
            
            # Set task status to completed
            result_data = {
                "result": result,
                "processing_time": processing_time,
                "worker_id": worker_id
            }
            await self.redis.set_task_status(task_id, ProcessingStatus.COMPLETED, result_data)
            
            logger.info(f"Task {task_id} completed in {processing_time:.2f}s")
            
        except asyncio.TimeoutError:
            logger.error(f"Task {task_id} timed out")
            await self.redis.set_task_status(
                task_id, 
                ProcessingStatus.FAILED, 
                {"error": "Task timed out"}
            )
        except Exception as e:
            logger.error(f"Task {task_id} failed: {e}")
            await self.redis.set_task_status(
                task_id, 
                ProcessingStatus.FAILED, 
                {"error": str(e)}
            )
    
    async def submit_task(self, task_data: Dict[str, Any]) -> str:
        """Submit a task to the appropriate queue"""
        task_type = task_data.get("task_type")
        task_id = task_data.get("task_id")
        priority = task_data.get("priority", 1)
        
        if not task_type or not task_id:
            raise ValueError("Task must have task_type and task_id")
        
        # Validate task type
        try:
            TaskType(task_type)
        except ValueError:
            raise ValueError(f"Invalid task type: {task_type}")
        
        # Set initial task status
        await self.redis.set_task_status(task_id, ProcessingStatus.PENDING)
        
        # Add to queue
        success = await self.redis.enqueue_task(task_type, task_data, priority)
        if not success:
            raise RuntimeError("Failed to enqueue task")
        
        logger.info(f"Submitted task {task_id} ({task_type}) with priority {priority}")
        return task_id
    
    async def get_task_result(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Get task result"""
        return await self.redis.get_task_status(task_id)
    
    async def get_queue_stats(self) -> Dict[str, Any]:
        """Get queue statistics"""
        stats = {}
        
        for task_type in TaskType:
            queue_size = await self.redis.get_queue_size(task_type.value)
            stats[task_type.value] = {
                "pending_tasks": queue_size,
                "workers": settings.MAX_WORKERS
            }
        
        stats["total_workers"] = len(self.workers)
        stats["active_workers"] = len([w for w in self.workers if not w.done()])
        
        return stats