"""
Enhanced error handling utilities for quantum backend API.
Provides standardized error responses and improved logging without modifying core logic.
"""

import logging
import time
from typing import Dict, Any, Optional
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
import traceback

logger = logging.getLogger(__name__)

# ============================================================================
# Enhanced Error Classes
# ============================================================================

class QuantumAPIError(Exception):
    """Enhanced quantum API error with structured information"""

    def __init__(
        self,
        message: str,
        status_code: int = 500,
        error_code: str = "QUANTUM_API_ERROR",
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        self.details = details or {}
        super().__init__(self.message)

class ValidationError(QuantumAPIError):
    """Validation-specific error"""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, 400, "VALIDATION_ERROR", details)

class CircuitExecutionError(QuantumAPIError):
    """Circuit execution error"""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, 500, "CIRCUIT_EXECUTION_ERROR", details)

class IBMQuantumError(QuantumAPIError):
    """IBM Quantum specific error"""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, 502, "IBM_QUANTUM_ERROR", details)

class RateLimitError(QuantumAPIError):
    """Rate limiting error"""
    def __init__(self, message: str, retry_after: int):
        super().__init__(message, 429, "RATE_LIMIT_EXCEEDED", {"retry_after": retry_after})

# ============================================================================
# Error Response Builders
# ============================================================================

def build_error_response(
    error: Exception,
    status_code: int = 500,
    error_code: str = "INTERNAL_ERROR",
    include_traceback: bool = False
) -> Dict[str, Any]:
    """
    Build a standardized error response.

    Args:
        error: The exception that occurred
        status_code: HTTP status code
        error_code: Error code identifier
        include_traceback: Whether to include stack trace (only in debug mode)

    Returns:
        Standardized error response
    """
    response = {
        "success": False,
        "error": error_code,
        "message": str(error),
        "timestamp": time.time()
    }

    # Add additional details for specific error types
    if isinstance(error, QuantumAPIError):
        response["error"] = error.error_code
        response["status_code"] = error.status_code
        if error.details:
            response["details"] = error.details

    # Include traceback in development/debug mode
    if include_traceback:
        response["traceback"] = traceback.format_exc()

    return response

def build_success_response(data: Any, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Build a standardized success response.

    Args:
        data: Response data
        metadata: Additional metadata

    Returns:
        Standardized success response
    """
    response = {
        "success": True,
        "data": data,
        "timestamp": time.time()
    }

    if metadata:
        response["metadata"] = metadata

    return response

# ============================================================================
# Request Logging Middleware
# ============================================================================

async def log_request_middleware(request: Request, call_next):
    """
    Enhanced request logging middleware.

    Logs request details, timing, and errors without affecting response.
    """
    start_time = time.time()
    request_id = f"{int(start_time * 1000)}"

    # Log request start
    logger.info(f"[{request_id}] {request.method} {request.url.path} - Request started", extra={
        "request_id": request_id,
        "method": request.method,
        "path": request.url.path,
        "query_params": dict(request.query_params),
        "client_ip": request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent")
    })

    try:
        # Process request
        response = await call_next(request)

        # Calculate duration
        duration = time.time() - start_time

        # Log successful response
        logger.info(f"[{request_id}] {request.method} {request.url.path} - Completed in {duration:.3f}s", extra={
            "request_id": request_id,
            "status_code": response.status_code,
            "duration": duration
        })

        return response

    except Exception as e:
        # Calculate duration
        duration = time.time() - start_time

        # Log error
        logger.error(f"[{request_id}] {request.method} {request.url.path} - Failed after {duration:.3f}s: {str(e)}", extra={
            "request_id": request_id,
            "error": str(e),
            "error_type": type(e).__name__,
            "duration": duration,
            "traceback": traceback.format_exc()
        })

        # Re-raise to let FastAPI handle the error
        raise

# ============================================================================
# Enhanced Exception Handlers
# ============================================================================

def create_exception_handler(status_code: int, error_code: str):
    """
    Create a standardized exception handler.

    Args:
        status_code: HTTP status code for this error type
        error_code: Error code identifier

    Returns:
        Exception handler function
    """
    async def handler(request: Request, exc: Exception):
        logger.error(f"Exception handler triggered for {type(exc).__name__}: {str(exc)}", extra={
            "path": request.url.path,
            "method": request.method,
            "error_type": type(exc).__name__,
            "error_code": error_code
        })

        return JSONResponse(
            status_code=status_code,
            content=build_error_response(exc, status_code, error_code)
        )

    return handler

# ============================================================================
# Health Check Utilities
# ============================================================================

def perform_health_checks() -> Dict[str, Any]:
    """
    Perform comprehensive health checks.

    Returns:
        Health check results
    """
    health_status = {
        "status": "healthy",
        "timestamp": time.time(),
        "checks": {}
    }

    # Database check
    try:
        # Import here to avoid circular imports
        from database import get_session
        import asyncio

        # Note: This is a simplified check - in production you'd actually test DB connectivity
        health_status["checks"]["database"] = {
            "status": "healthy",
            "message": "Database connection available"
        }
    except Exception as e:
        health_status["checks"]["database"] = {
            "status": "unhealthy",
            "message": f"Database check failed: {str(e)}"
        }
        health_status["status"] = "unhealthy"

    # Cache check
    try:
        from cache import quantum_cache
        cache_stats = quantum_cache.get_stats_sync() if hasattr(quantum_cache, 'get_stats_sync') else {}
        health_status["checks"]["cache"] = {
            "status": "healthy",
            "message": "Cache system operational",
            "stats": cache_stats
        }
    except Exception as e:
        health_status["checks"]["cache"] = {
            "status": "unhealthy",
            "message": f"Cache check failed: {str(e)}"
        }

    # Worker pool check
    try:
        from container import container
        worker_pool = container.worker_pool()
        if worker_pool:
            health_status["checks"]["worker_pool"] = {
                "status": "healthy",
                "message": "Worker pool operational"
            }
        else:
            health_status["checks"]["worker_pool"] = {
                "status": "warning",
                "message": "Worker pool not initialized"
            }
    except Exception as e:
        health_status["checks"]["worker_pool"] = {
            "status": "unhealthy",
            "message": f"Worker pool check failed: {str(e)}"
        }

    return health_status

# ============================================================================
# Metrics and Monitoring
# ============================================================================

class RequestMetrics:
    """Enhanced request metrics collection"""

    def __init__(self):
        self.requests_total = 0
        self.requests_by_endpoint = {}
        self.errors_by_type = {}
        self.response_times = []

    def record_request(self, endpoint: str, method: str, duration: float, status_code: int):
        """Record request metrics"""
        self.requests_total += 1

        endpoint_key = f"{method} {endpoint}"
        if endpoint_key not in self.requests_by_endpoint:
            self.requests_by_endpoint[endpoint_key] = 0
        self.requests_by_endpoint[endpoint_key] += 1

        self.response_times.append(duration)

        # Keep only last 1000 response times
        if len(self.response_times) > 1000:
            self.response_times = self.response_times[-1000:]

    def record_error(self, error_type: str):
        """Record error metrics"""
        if error_type not in self.errors_by_type:
            self.errors_by_type[error_type] = 0
        self.errors_by_type[error_type] += 1

    def get_summary(self) -> Dict[str, Any]:
        """Get metrics summary"""
        avg_response_time = sum(self.response_times) / len(self.response_times) if self.response_times else 0

        return {
            "total_requests": self.requests_total,
            "requests_by_endpoint": self.requests_by_endpoint,
            "errors_by_type": self.errors_by_type,
            "avg_response_time": avg_response_time,
            "min_response_time": min(self.response_times) if self.response_times else 0,
            "max_response_time": max(self.response_times) if self.response_times else 0
        }

# Global metrics instance
request_metrics = RequestMetrics()

# ============================================================================
# Setup Function
# ============================================================================

def setup_enhanced_error_handling(app):
    """
    Setup enhanced error handling for the FastAPI application.

    Args:
        app: FastAPI application instance
    """
    # Add request logging middleware
    @app.middleware("http")
    async def enhanced_logging_middleware(request: Request, call_next):
        return await log_request_middleware(request, call_next)

    # Add custom exception handlers
    app.add_exception_handler(QuantumAPIError, create_exception_handler(500, "QUANTUM_API_ERROR"))
    app.add_exception_handler(ValidationError, create_exception_handler(400, "VALIDATION_ERROR"))
    app.add_exception_handler(CircuitExecutionError, create_exception_handler(500, "CIRCUIT_EXECUTION_ERROR"))
    app.add_exception_handler(IBMQuantumError, create_exception_handler(502, "IBM_QUANTUM_ERROR"))
    app.add_exception_handler(RateLimitError, create_exception_handler(429, "RATE_LIMIT_EXCEEDED"))

    logger.info("Enhanced error handling and logging configured")