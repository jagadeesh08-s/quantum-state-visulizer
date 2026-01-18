"""
Performance optimizations and caching strategies
"""
from functools import lru_cache, wraps
from typing import Callable, Any, Optional
import asyncio
import time
from cache import quantum_cache
from container import container


def async_cache(ttl: int = 3600):
    """
    Async function caching decorator
    
    Args:
        ttl: Time to live in seconds
    """
    def decorator(func: Callable) -> Callable:
        cache_key_prefix = f"async_cache:{func.__module__}:{func.__name__}"
        
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate cache key from arguments
            import hashlib
            import json
            key_data = json.dumps({
                "args": str(args),
                "kwargs": sorted(kwargs.items())
            }, sort_keys=True)
            cache_key = f"{cache_key_prefix}:{hashlib.sha256(key_data.encode()).hexdigest()[:16]}"
            
            # Try to get from cache
            cached_result = await quantum_cache.backend.get(cache_key)
            if cached_result is not None:
                container.logger().debug("async_cache_hit", function=func.__name__)
                return cached_result
            
            # Execute function
            result = await func(*args, **kwargs)
            
            # Store in cache
            await quantum_cache.backend.set(cache_key, result, ttl)
            container.logger().debug("async_cache_miss", function=func.__name__)
            
            return result
        
        return wrapper
    return decorator


class QueryOptimizer:
    """Database query optimization utilities"""
    
    @staticmethod
    def add_pagination(query, page: int = 1, page_size: int = 100):
        """Add pagination to SQLAlchemy query"""
        offset = (page - 1) * page_size
        return query.limit(page_size).offset(offset)
    
    @staticmethod
    def add_index_hints(query, indexes: list[str]):
        """Add index hints for query optimization (database-specific)"""
        # This would be database-specific implementation
        return query
    
    @staticmethod
    def optimize_select(query, fields: Optional[list] = None):
        """Optimize SELECT query by specifying only needed fields"""
        if fields:
            # This would need to be implemented based on SQLAlchemy model
            pass
        return query


class ConnectionPoolManager:
    """Manage database connection pools efficiently"""
    
    @staticmethod
    async def get_optimal_pool_size():
        """Calculate optimal pool size based on system resources"""
        import os
        # Base calculation on CPU count and expected concurrency
        cpu_count = os.cpu_count() or 4
        optimal_size = max(5, cpu_count * 2)
        return min(optimal_size, 20)  # Cap at 20
    
    @staticmethod
    def monitor_pool_health(pool):
        """Monitor connection pool health"""
        return {
            "size": pool.size() if hasattr(pool, 'size') else 0,
            "checked_in": pool.checkedin() if hasattr(pool, 'checkedin') else 0,
            "checked_out": pool.checkedout() if hasattr(pool, 'checkedout') else 0,
            "overflow": pool.overflow() if hasattr(pool, 'overflow') else 0
        }


class ResponseCompression:
    """Response compression utilities"""
    
    @staticmethod
    def should_compress(content_type: str, content_length: int) -> bool:
        """Determine if response should be compressed"""
        compressible_types = [
            "application/json",
            "application/xml",
            "text/html",
            "text/plain",
            "text/css",
            "text/javascript"
        ]
        
        # Compress if type is compressible and size > 1KB
        return (
            any(ct in content_type for ct in compressible_types) and
            content_length > 1024
        )


def batch_process(items: list, batch_size: int = 100, processor: Callable = None):
    """
    Process items in batches to avoid memory issues
    
    Args:
        items: List of items to process
        batch_size: Number of items per batch
        processor: Async function to process each batch
    """
    async def process_batches():
        for i in range(0, len(items), batch_size):
            batch = items[i:i + batch_size]
            if processor:
                await processor(batch)
            else:
                yield batch
    
    return process_batches()


class LazyLoader:
    """Lazy loading utility for expensive operations"""
    
    def __init__(self, loader_func: Callable):
        self.loader_func = loader_func
        self._value: Optional[Any] = None
        self._loaded = False
        self._lock = asyncio.Lock()
    
    async def get(self):
        """Get value, loading if necessary"""
        if not self._loaded:
            async with self._lock:
                if not self._loaded:
                    self._value = await self.loader_func()
                    self._loaded = True
        return self._value
    
    def reset(self):
        """Reset loader to force reload"""
        self._loaded = False
        self._value = None


def measure_performance(func: Callable):
    """Decorator to measure function performance"""
    @wraps(func)
    async def async_wrapper(*args, **kwargs):
        start_time = time.time()
        try:
            result = await func(*args, **kwargs)
            duration = time.time() - start_time
            
            container.logger().info(
                "performance_metric",
                function=func.__name__,
                duration=duration,
                status="success"
            )
            return result
        except Exception as e:
            duration = time.time() - start_time
            container.logger().warning(
                "performance_metric",
                function=func.__name__,
                duration=duration,
                status="error",
                error=str(e)
            )
            raise
    
    @wraps(func)
    def sync_wrapper(*args, **kwargs):
        start_time = time.time()
        try:
            result = func(*args, **kwargs)
            duration = time.time() - start_time
            
            container.logger().info(
                "performance_metric",
                function=func.__name__,
                duration=duration,
                status="success"
            )
            return result
        except Exception as e:
            duration = time.time() - start_time
            container.logger().warning(
                "performance_metric",
                function=func.__name__,
                duration=duration,
                status="error",
                error=str(e)
            )
            raise
    
    if asyncio.iscoroutinefunction(func):
        return async_wrapper
    return sync_wrapper
