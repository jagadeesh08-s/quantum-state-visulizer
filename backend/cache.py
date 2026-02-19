"""
Enhanced caching system with Redis support
"""
import json
import hashlib
from typing import Any, Optional, Dict
from abc import ABC, abstractmethod
import time
try:
    import redis  # type: ignore[import-untyped]
except ImportError:
    redis = None  # type: ignore

from config import config


class CacheBackend(ABC):
    """Abstract cache backend"""

    @abstractmethod
    async def get(self, key: str) -> Optional[Any]:
        pass

    @abstractmethod
    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        pass

    @abstractmethod
    async def delete(self, key: str) -> None:
        pass

    @abstractmethod
    async def clear(self) -> None:
        pass

    @abstractmethod
    async def get_stats(self) -> Dict[str, Any]:
        pass


class RedisCache(CacheBackend):
    """Redis-based cache backend"""

    def __init__(self, redis_client: redis.Redis, default_ttl: int = 3600):
        self.redis = redis_client
        self.default_ttl = default_ttl

    async def get(self, key: str) -> Optional[Any]:
        try:
            data = self.redis.get(key)
            if data:
                return json.loads(data)
            return None
        except Exception as e:
            print(f"Redis cache get error: {e}")
            return None

    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        try:
            ttl_value = ttl or self.default_ttl
            self.redis.setex(key, ttl_value, json.dumps(value))
        except Exception as e:
            print(f"Redis cache set error: {e}")

    async def delete(self, key: str) -> None:
        try:
            self.redis.delete(key)
        except Exception as e:
            print(f"Redis cache delete error: {e}")

    async def clear(self) -> None:
        try:
            self.redis.flushdb()
        except Exception as e:
            print(f"Redis cache clear error: {e}")

    async def get_stats(self) -> Dict[str, Any]:
        try:
            info = self.redis.info()
            return {
                "backend": "redis",
                "connected": True,
                "keys": self.redis.dbsize(),
                "memory_used": info.get("used_memory_human", "unknown"),
                "connections": info.get("connected_clients", 0)
            }
        except Exception as e:
            return {
                "backend": "redis",
                "connected": False,
                "error": str(e)
            }


class MemoryCache(CacheBackend):
    """Fallback in-memory cache"""

    def __init__(self, max_size: int = 1000, default_ttl: int = 3600):
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.max_size = max_size
        self.default_ttl = default_ttl

    async def get(self, key: str) -> Optional[Any]:
        entry = self.cache.get(key)
        if not entry:
            return None

        if time.time() > entry["expiry"]:
            del self.cache[key]
            return None

        return entry["data"]

    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        if len(self.cache) >= self.max_size:
            # Remove oldest entries
            oldest_key = min(self.cache.keys(),
                           key=lambda k: self.cache[k]["timestamp"])
            del self.cache[oldest_key]

        self.cache[key] = {
            "data": value,
            "expiry": time.time() + (ttl or self.default_ttl),
            "timestamp": time.time()
        }

    async def delete(self, key: str) -> None:
        self.cache.pop(key, None)

    async def clear(self) -> None:
        self.cache.clear()

    async def get_stats(self) -> Dict[str, Any]:
        return {
            "backend": "memory",
            "size": len(self.cache),
            "max_size": self.max_size,
            "entries": list(self.cache.keys())[:10]  # Show first 10 keys
        }


class QuantumCache:
    """High-level quantum-specific cache with circuit hashing"""

    def __init__(self, backend: CacheBackend):
        self.backend = backend

    def _hash_circuit(self, circuit: Dict[str, Any]) -> str:
        """Generate deterministic hash for circuit"""
        circuit_str = json.dumps(circuit, sort_keys=True)
        return hashlib.sha256(circuit_str.encode()).hexdigest()[:16]

    def _make_key(self, prefix: str, circuit_hash: str, backend: str = "") -> str:
        """Generate cache key"""
        return f"{prefix}:{circuit_hash}:{backend}".rstrip(":")

    async def get_simulation_result(self, circuit: Dict[str, Any], backend: str) -> Optional[Any]:
        """Get cached simulation result"""
        circuit_hash = self._hash_circuit(circuit)
        key = self._make_key("simulation", circuit_hash, backend)
        return await self.backend.get(key)

    async def set_simulation_result(self, circuit: Dict[str, Any], backend: str, result: Any) -> None:
        """Cache simulation result"""
        circuit_hash = self._hash_circuit(circuit)
        key = self._make_key("simulation", circuit_hash, backend)
        await self.backend.set(key, result, config.redis.ttl)

    async def get_transpiled_circuit(self, circuit: Dict[str, Any], backend: str) -> Optional[Any]:
        """Get cached transpiled circuit"""
        circuit_hash = self._hash_circuit(circuit)
        key = self._make_key("transpiled", circuit_hash, backend)
        return await self.backend.get(key)

    async def set_transpiled_circuit(self, circuit: Dict[str, Any], backend: str, transpiled: Any) -> None:
        """Cache transpiled circuit"""
        circuit_hash = self._hash_circuit(circuit)
        key = self._make_key("transpiled", circuit_hash, backend)
        await self.backend.set(key, transpiled, config.redis.ttl * 2)  # Longer TTL for transpiled circuits

    async def get_ai_response(self, question: str) -> Optional[str]:
        """Get cached AI response"""
        question_hash = hashlib.sha256(question.encode()).hexdigest()[:16]
        key = f"ai:{question_hash}"
        return await self.backend.get(key)

    async def set_ai_response(self, question: str, response: str) -> None:
        """Cache AI response"""
        question_hash = hashlib.sha256(question.encode()).hexdigest()[:16]
        key = f"ai:{question_hash}"
        await self.backend.set(key, response, config.redis.ttl * 24)  # 24 hour TTL for AI responses

    async def clear_all(self) -> None:
        """Clear all cached data"""
        await self.backend.clear()

    async def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        return await self.backend.get_stats()


# Global cache instances
try:
    redis_client = redis.Redis.from_url(
        config.redis.url,
        db=config.redis.db,
        max_connections=config.redis.max_connections,
        decode_responses=True
    )
    # Test connection
    redis_client.ping()
    cache_backend = RedisCache(redis_client, config.redis.ttl)
    print("[OK] Redis cache initialized successfully")
except Exception as e:
    print(f"[!] Redis connection failed, falling back to memory cache: {e}")
    cache_backend = MemoryCache(max_size=1000, default_ttl=config.redis.ttl)

quantum_cache = QuantumCache(cache_backend)