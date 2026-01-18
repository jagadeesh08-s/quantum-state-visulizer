"""
Monitoring and metrics collection for Quantum Backend
"""
import time
from typing import Dict, Any, Optional
from contextlib import asynccontextmanager
from fastapi import Request, Response
from fastapi.responses import JSONResponse
try:
    from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST  # type: ignore[import-untyped]
except ImportError:
    Counter = None  # type: ignore
    Histogram = None  # type: ignore
    Gauge = None  # type: ignore
    generate_latest = None  # type: ignore
    CONTENT_TYPE_LATEST = "text/plain"  # type: ignore

try:
    import structlog  # type: ignore[import-untyped]
except ImportError:
    structlog = None  # type: ignore

from config import config
from container import container


# Initialize metrics
REQUEST_COUNT = Counter(
    'quantum_requests_total',
    'Total quantum requests',
    ['endpoint', 'method', 'status_code']
)

REQUEST_DURATION = Histogram(
    'quantum_request_duration_seconds',
    'Request duration in seconds',
    ['endpoint', 'method']
)

SIMULATION_COUNT = Counter(
    'quantum_simulations_total',
    'Total quantum simulations',
    ['backend', 'success']
)

SIMULATION_DURATION = Histogram(
    'quantum_simulation_duration_seconds',
    'Simulation duration in seconds',
    ['backend']
)

ACTIVE_WORKERS = Gauge(
    'quantum_active_workers',
    'Number of active quantum workers'
)

CACHE_HITS = Counter(
    'quantum_cache_hits_total',
    'Total cache hits',
    ['cache_type']
)

CACHE_MISSES = Counter(
    'quantum_cache_misses_total',
    'Total cache misses',
    ['cache_type']
)

IBM_API_CALLS = Counter(
    'quantum_ibm_api_calls_total',
    'Total IBM Quantum API calls',
    ['endpoint', 'success']
)


class MetricsCollector:
    """Metrics collection and monitoring"""

    def __init__(self):
        self.logger = structlog.get_logger("quantum-monitoring")

    async def record_request(self, endpoint: str, method: str, status_code: int, duration: float):
        """Record HTTP request metrics"""
        REQUEST_COUNT.labels(endpoint=endpoint, method=method, status_code=status_code).inc()
        REQUEST_DURATION.labels(endpoint=endpoint, method=method).observe(duration)

        # Structured logging
        self.logger.info(
            "request_completed",
            endpoint=endpoint,
            method=method,
            status_code=status_code,
            duration=duration
        )

    async def record_simulation(self, backend: str, success: bool, duration: float):
        """Record quantum simulation metrics"""
        SIMULATION_COUNT.labels(backend=backend, success=success).inc()
        SIMULATION_DURATION.labels(backend=backend).observe(duration)

        self.logger.info(
            "simulation_completed",
            backend=backend,
            success=success,
            duration=duration
        )

    async def record_cache_hit(self, cache_type: str):
        """Record cache hit"""
        CACHE_HITS.labels(cache_type=cache_type).inc()

    async def record_cache_miss(self, cache_type: str):
        """Record cache miss"""
        CACHE_MISSES.labels(cache_type=cache_type).inc()

    async def record_ibm_api_call(self, endpoint: str, success: bool):
        """Record IBM Quantum API call"""
        IBM_API_CALLS.labels(endpoint=endpoint, success=success).inc()

    def update_active_workers(self, count: int):
        """Update active workers gauge"""
        ACTIVE_WORKERS.set(count)

    async def get_health_status(self) -> Dict[str, Any]:
        """Get comprehensive health status"""
        health_data = {
            "status": "healthy",
            "timestamp": time.time(),
            "services": {}
        }

        # Check cache health
        try:
            cache_stats = await container.quantum_cache.get_stats()
            health_data["services"]["cache"] = {
                "status": "healthy" if cache_stats.get("connected", True) else "unhealthy",
                "stats": cache_stats
            }
        except Exception as e:
            health_data["services"]["cache"] = {
                "status": "unhealthy",
                "error": str(e)
            }

        # Check IBM Quantum connectivity
        try:
            # This would be a lightweight health check
            health_data["services"]["ibm_quantum"] = {
                "status": "healthy",
                "token_configured": bool(config.ibm_quantum.token)
            }
        except Exception as e:
            health_data["services"]["ibm_quantum"] = {
                "status": "unhealthy",
                "error": str(e)
            }

        # Check worker pool
        try:
            worker_count = container.worker_pool().active_count if hasattr(container.worker_pool(), 'active_count') else 0
            health_data["services"]["workers"] = {
                "status": "healthy",
                "active_workers": worker_count,
                "pool_size": config.quantum.worker_pool_size
            }
        except Exception as e:
            health_data["services"]["workers"] = {
                "status": "unhealthy",
                "error": str(e)
            }

        # Overall health
        unhealthy_services = [s for s in health_data["services"].values() if s["status"] == "unhealthy"]
        if unhealthy_services:
            health_data["status"] = "degraded"

        return health_data


# Global metrics collector
metrics_collector = MetricsCollector()


@asynccontextmanager
async def metrics_middleware(request: Request, call_next):
    """FastAPI middleware for collecting request metrics"""
    start_time = time.time()

    try:
        response = await call_next(request)
        duration = time.time() - start_time

        # Record metrics
        endpoint = request.url.path
        method = request.method
        status_code = response.status_code

        await metrics_collector.record_request(endpoint, method, status_code, duration)

        return response

    except Exception as e:
        duration = time.time() - start_time
        await metrics_collector.record_request(request.url.path, request.method, 500, duration)
        raise


async def get_metrics():
    """Prometheus metrics endpoint"""
    return Response(
        generate_latest(),
        media_type=CONTENT_TYPE_LATEST
    )


async def get_health():
    """Enhanced health check endpoint"""
    health_data = await metrics_collector.get_health_status()

    # Return 200 even if degraded (e.g. Redis down) as the app is still functional
    status_code = 200 if health_data["status"] in ["healthy", "degraded"] else 503
    return JSONResponse(
        content=health_data,
        status_code=status_code
    )


# Structured logging configuration
def setup_logging():
    """Setup structured logging"""
    import logging
    import sys

    # Configure standard logging
    logging.basicConfig(
        level=getattr(logging, config.monitoring.log_level),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler('backend.log')
        ]
    )

    # Configure structlog
    structlog.configure(
        processors=[
            structlog.stdlib.filter_by_level,
            structlog.stdlib.add_logger_name,
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            structlog.processors.JSONRenderer()
        ],
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )


# Initialize logging
setup_logging()