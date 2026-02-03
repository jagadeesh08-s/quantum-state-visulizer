"""
Redis Cache Manager for Quantum Simulations
Provides caching layer for circuit simulations and results
"""

import redis
import json
import hashlib
from typing import Any, Optional, Dict
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)

class RedisCache:
    """Redis-based caching for quantum simulations"""
    
    def __init__(self, host: str = 'localhost', port: int = 6379, db: int = 0, password: Optional[str] = None):
        """Initialize Redis connection"""
        try:
            self.redis_client = redis.Redis(
                host=host,
                port=port,
                db=db,
                password=password,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5
            )
            # Test connection
            self.redis_client.ping()
            self.enabled = True
            logger.info(f"Redis cache connected successfully to {host}:{port}")
        except (redis.ConnectionError, redis.TimeoutError) as e:
            logger.warning(f"Redis connection failed: {e}. Caching disabled.")
            self.enabled = False
            self.redis_client = None
    
    def _generate_key(self, prefix: str, data: Dict[str, Any]) -> str:
        """Generate a unique cache key from data"""
        # Sort keys for consistent hashing
        sorted_data = json.dumps(data, sort_keys=True)
        hash_value = hashlib.sha256(sorted_data.encode()).hexdigest()[:16]
        return f"{prefix}:{hash_value}"
    
    def get_circuit_result(self, circuit_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Get cached circuit simulation result"""
        if not self.enabled:
            return None
        
        try:
            key = self._generate_key("circuit", circuit_data)
            cached = self.redis_client.get(key)
            if cached:
                logger.debug(f"Cache HIT for circuit: {key}")
                return json.loads(cached)
            logger.debug(f"Cache MISS for circuit: {key}")
            return None
        except Exception as e:
            logger.error(f"Redis get error: {e}")
            return None
    
    def set_circuit_result(self, circuit_data: Dict[str, Any], result: Dict[str, Any], ttl: int = 3600):
        """Cache circuit simulation result"""
        if not self.enabled:
            return
        
        try:
            key = self._generate_key("circuit", circuit_data)
            self.redis_client.setex(
                key,
                timedelta(seconds=ttl),
                json.dumps(result)
            )
            logger.debug(f"Cached circuit result: {key} (TTL: {ttl}s)")
        except Exception as e:
            logger.error(f"Redis set error: {e}")
    
    def get_transpiled_circuit(self, circuit_data: Dict[str, Any], backend_name: str) -> Optional[str]:
        """Get cached transpiled circuit"""
        if not self.enabled:
            return None
        
        try:
            cache_data = {**circuit_data, "backend": backend_name}
            key = self._generate_key("transpiled", cache_data)
            cached = self.redis_client.get(key)
            if cached:
                logger.debug(f"Cache HIT for transpiled circuit: {key}")
                return cached
            logger.debug(f"Cache MISS for transpiled circuit: {key}")
            return None
        except Exception as e:
            logger.error(f"Redis get error: {e}")
            return None
    
    def set_transpiled_circuit(self, circuit_data: Dict[str, Any], backend_name: str, 
                              transpiled_qasm: str, ttl: int = 7200):
        """Cache transpiled circuit"""
        if not self.enabled:
            return
        
        try:
            cache_data = {**circuit_data, "backend": backend_name}
            key = self._generate_key("transpiled", cache_data)
            self.redis_client.setex(
                key,
                timedelta(seconds=ttl),
                transpiled_qasm
            )
            logger.debug(f"Cached transpiled circuit: {key} (TTL: {ttl}s)")
        except Exception as e:
            logger.error(f"Redis set error: {e}")
    
    def get_dag_optimization(self, circuit_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Get cached DAG optimization"""
        if not self.enabled:
            return None
        
        try:
            key = self._generate_key("dag", circuit_data)
            cached = self.redis_client.get(key)
            if cached:
                logger.debug(f"Cache HIT for DAG: {key}")
                return json.loads(cached)
            return None
        except Exception as e:
            logger.error(f"Redis get error: {e}")
            return None
    
    def set_dag_optimization(self, circuit_data: Dict[str, Any], optimized_dag: Dict[str, Any], ttl: int = 7200):
        """Cache DAG optimization"""
        if not self.enabled:
            return
        
        try:
            key = self._generate_key("dag", circuit_data)
            self.redis_client.setex(
                key,
                timedelta(seconds=ttl),
                json.dumps(optimized_dag)
            )
            logger.debug(f"Cached DAG optimization: {key} (TTL: {ttl}s)")
        except Exception as e:
            logger.error(f"Redis set error: {e}")
    
    def invalidate_pattern(self, pattern: str):
        """Invalidate all keys matching pattern"""
        if not self.enabled:
            return
        
        try:
            keys = self.redis_client.keys(pattern)
            if keys:
                self.redis_client.delete(*keys)
                logger.info(f"Invalidated {len(keys)} keys matching pattern: {pattern}")
        except Exception as e:
            logger.error(f"Redis invalidate error: {e}")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        if not self.enabled:
            return {"enabled": False}
        
        try:
            info = self.redis_client.info('stats')
            return {
                "enabled": True,
                "total_keys": self.redis_client.dbsize(),
                "hits": info.get('keyspace_hits', 0),
                "misses": info.get('keyspace_misses', 0),
                "hit_rate": self._calculate_hit_rate(info)
            }
        except Exception as e:
            logger.error(f"Redis stats error: {e}")
            return {"enabled": True, "error": str(e)}
    
    def _calculate_hit_rate(self, info: Dict) -> float:
        """Calculate cache hit rate"""
        hits = info.get('keyspace_hits', 0)
        misses = info.get('keyspace_misses', 0)
        total = hits + misses
        return (hits / total * 100) if total > 0 else 0.0
    
    def clear_all(self):
        """Clear all cached data (use with caution)"""
        if not self.enabled:
            return
        
        try:
            self.redis_client.flushdb()
            logger.warning("All cache data cleared")
        except Exception as e:
            logger.error(f"Redis clear error: {e}")

# Global cache instance
_cache_instance: Optional[RedisCache] = None

def get_cache() -> RedisCache:
    """Get or create global cache instance"""
    global _cache_instance
    if _cache_instance is None:
        # Try to get Redis config from environment
        import os
        host = os.getenv('REDIS_HOST', 'localhost')
        port = int(os.getenv('REDIS_PORT', '6379'))
        password = os.getenv('REDIS_PASSWORD')
        
        _cache_instance = RedisCache(host=host, port=port, password=password)
    
    return _cache_instance
