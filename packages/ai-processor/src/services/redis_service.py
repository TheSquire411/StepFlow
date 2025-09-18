"""
Redis service for queue management and caching
"""

import json
import asyncio
from typing import Optional, Dict, Any, List
import redis.asyncio as redis
from loguru import logger

from ..config import settings


class RedisService:
    """Redis service for managing queues and caching"""
    
    def __init__(self):
        self.redis_client: Optional[redis.Redis] = None
        self.pubsub: Optional[redis.client.PubSub] = None
        
    async def connect(self):
        """Connect to Redis"""
        try:
            # Build Redis URL
            if settings.REDIS_PASSWORD:
                redis_url = f"redis://:{settings.REDIS_PASSWORD}@{settings.REDIS_HOST}:{settings.REDIS_PORT}/{settings.REDIS_DB}"
            else:
                redis_url = f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}/{settings.REDIS_DB}"
            
            self.redis_client = redis.from_url(
                redis_url,
                encoding="utf-8",
                decode_responses=True,
                socket_connect_timeout=5,
                socket_keepalive=True,
                socket_keepalive_options={},
                health_check_interval=30
            )
            
            # Test connection
            await self.redis_client.ping()
            logger.info("Connected to Redis successfully")
            
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            raise
    
    async def disconnect(self):
        """Disconnect from Redis"""
        if self.pubsub:
            await self.pubsub.close()
        if self.redis_client:
            await self.redis_client.close()
        logger.info("Disconnected from Redis")
    
    async def enqueue_task(self, queue_name: str, task_data: Dict[str, Any], priority: int = 1) -> bool:
        """Add task to queue with priority"""
        try:
            task_json = json.dumps(task_data)
            # Use sorted set for priority queue (lower score = higher priority)
            score = -priority  # Negative for reverse order
            await self.redis_client.zadd(f"queue:{queue_name}", {task_json: score})
            logger.debug(f"Enqueued task to {queue_name} with priority {priority}")
            return True
        except Exception as e:
            logger.error(f"Failed to enqueue task: {e}")
            return False
    
    async def dequeue_task(self, queue_name: str) -> Optional[Dict[str, Any]]:
        """Get highest priority task from queue"""
        try:
            # Get highest priority task (lowest score)
            result = await self.redis_client.zpopmin(f"queue:{queue_name}")
            if result:
                task_json, _ = result[0]
                return json.loads(task_json)
            return None
        except Exception as e:
            logger.error(f"Failed to dequeue task: {e}")
            return None
    
    async def get_queue_size(self, queue_name: str) -> int:
        """Get queue size"""
        try:
            return await self.redis_client.zcard(f"queue:{queue_name}")
        except Exception as e:
            logger.error(f"Failed to get queue size: {e}")
            return 0
    
    async def set_task_status(self, task_id: str, status: str, result: Optional[Dict[str, Any]] = None):
        """Set task status and result"""
        try:
            task_key = f"task:{task_id}"
            task_data = {
                "status": status,
                "updated_at": asyncio.get_event_loop().time()
            }
            if result:
                task_data["result"] = json.dumps(result)
            
            await self.redis_client.hset(task_key, mapping=task_data)
            await self.redis_client.expire(task_key, 3600)  # Expire after 1 hour
            
        except Exception as e:
            logger.error(f"Failed to set task status: {e}")
    
    async def get_task_status(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Get task status and result"""
        try:
            task_key = f"task:{task_id}"
            task_data = await self.redis_client.hgetall(task_key)
            if task_data and "result" in task_data:
                task_data["result"] = json.loads(task_data["result"])
            return task_data if task_data else None
        except Exception as e:
            logger.error(f"Failed to get task status: {e}")
            return None
    
    async def cache_set(self, key: str, value: Any, ttl: int = 3600):
        """Set cache value with TTL"""
        try:
            if isinstance(value, (dict, list)):
                value = json.dumps(value)
            await self.redis_client.setex(key, ttl, value)
        except Exception as e:
            logger.error(f"Failed to set cache: {e}")
    
    async def cache_get(self, key: str) -> Optional[Any]:
        """Get cache value"""
        try:
            value = await self.redis_client.get(key)
            if value:
                try:
                    return json.loads(value)
                except json.JSONDecodeError:
                    return value
            return None
        except Exception as e:
            logger.error(f"Failed to get cache: {e}")
            return None
    
    async def publish_message(self, channel: str, message: Dict[str, Any]):
        """Publish message to channel"""
        try:
            await self.redis_client.publish(channel, json.dumps(message))
        except Exception as e:
            logger.error(f"Failed to publish message: {e}")
    
    async def subscribe_to_channel(self, channel: str):
        """Subscribe to channel"""
        try:
            if not self.pubsub:
                self.pubsub = self.redis_client.pubsub()
            await self.pubsub.subscribe(channel)
            return self.pubsub
        except Exception as e:
            logger.error(f"Failed to subscribe to channel: {e}")
            return None