#!/usr/bin/env python3
"""
Health check script for AI Processor service
Used by Docker and Kubernetes health checks
"""

import sys
import asyncio
import httpx
from loguru import logger

from src.config import settings


async def check_health():
    """Check if the service is healthy"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"http://{settings.HOST}:{settings.PORT}/health",
                timeout=5.0
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "healthy":
                    logger.info("Health check passed")
                    return True
                    
        logger.error("Health check failed - unhealthy response")
        return False
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return False


def main():
    """Main health check function"""
    try:
        is_healthy = asyncio.run(check_health())
        sys.exit(0 if is_healthy else 1)
    except Exception as e:
        logger.error(f"Health check error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()