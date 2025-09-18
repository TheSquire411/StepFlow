#!/usr/bin/env python3
"""
StepFlow AI Processor Service
Main entry point for the AI processing microservice
"""

import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from loguru import logger

from src.config import settings
from src.api.routes import router
from src.services.redis_service import RedisService
from src.services.queue_service import QueueService


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    logger.info("Starting AI Processor Service...")
    
    # Initialize services
    redis_service = RedisService()
    await redis_service.connect()
    
    queue_service = QueueService(redis_service)
    await queue_service.start_workers()
    
    # Store services in app state
    app.state.redis = redis_service
    app.state.queue = queue_service
    
    logger.info("AI Processor Service started successfully")
    
    yield
    
    # Cleanup
    logger.info("Shutting down AI Processor Service...")
    await queue_service.stop_workers()
    await redis_service.disconnect()
    logger.info("AI Processor Service stopped")


# Create FastAPI app
app = FastAPI(
    title="StepFlow AI Processor",
    description="AI processing service for computer vision, NLP, and content generation",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(router, prefix="/api/v1")


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "ai-processor",
        "version": "1.0.0"
    }


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "StepFlow AI Processor Service",
        "version": "1.0.0",
        "docs": "/docs"
    }


if __name__ == "__main__":
    logger.info(f"Starting server on {settings.HOST}:{settings.PORT}")
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info" if not settings.DEBUG else "debug"
    )