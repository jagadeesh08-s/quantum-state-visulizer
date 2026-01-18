"""
Dependency Injection Container for Quantum Backend
"""
try:
    from dependency_injector import containers, providers  # type: ignore[import-untyped]
except ImportError:
    containers = None  # type: ignore
    providers = None  # type: ignore

from config import config

try:
    import redis  # type: ignore[import-untyped]
except ImportError:
    redis = None  # type: ignore

try:
    import structlog  # type: ignore[import-untyped]
except ImportError:
    structlog = None  # type: ignore

try:
    from prometheus_client import Counter, Histogram, Gauge  # type: ignore[import-untyped]
except ImportError:
    Counter = None  # type: ignore
    Histogram = None  # type: ignore
    Gauge = None  # type: ignore

import logging

# Import our services
from ibm_service import IBMQuantumService
from quantum_worker import QuantumWorkerPool
from quantum_knowledge_base import ask_ai_question


class Container(containers.DeclarativeContainer):
    """Main dependency injection container"""

    # Configuration - use the actual config instance
    config_obj = providers.Object(config)

    # Logging
    logger = providers.Singleton(
        lambda: structlog.get_logger("quantum-backend") if structlog else logging.getLogger("quantum-backend")
    )

    # Redis Cache
    redis_client = providers.Singleton(
        redis.Redis.from_url,
        url=config.redis.url,
        db=config.redis.db,
        max_connections=config.redis.max_connections,
        decode_responses=True
    )

    # Metrics
    request_count = providers.Singleton(
        Counter,
        'quantum_requests_total',
        'Total quantum requests',
        ['endpoint', 'method', 'status']
    )

    simulation_duration = providers.Singleton(
        Histogram,
        'quantum_simulation_duration_seconds',
        'Simulation duration in seconds',
        ['backend', 'success']
    )

    active_workers = providers.Singleton(
        Gauge,
        'quantum_active_workers',
        'Number of active quantum workers'
    )

    cache_hits = providers.Singleton(
        Counter,
        'quantum_cache_hits_total',
        'Total cache hits',
        ['cache_type']
    )

    # Services
    ibm_service = providers.Singleton(IBMQuantumService)

    worker_pool = providers.Singleton(
        QuantumWorkerPool,
        max_workers=config.quantum.worker_pool_size
    )

    # AI Service
    ai_service = providers.Callable(
        lambda: ask_ai_question  # This is a function, not a class
    )


# Global container instance
container = Container()