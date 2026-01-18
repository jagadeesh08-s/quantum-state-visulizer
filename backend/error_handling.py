"""
Comprehensive error handling system for Quantum Backend API
"""
import traceback
import uuid
from typing import Optional, Dict, Any
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
import time
from container import container
from config import config


class QuantumAPIError(Exception):
    """Base exception for Quantum API errors"""
    def __init__(self, message: str, status_code: int = 500, error_code: Optional[str] = None, details: Optional[Dict[str, Any]] = None):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code or "QUANTUM_API_ERROR"
        self.details = details or {}
        super().__init__(self.message)


class QuantumValidationError(QuantumAPIError):
    """Validation error"""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, status_code=400, error_code="VALIDATION_ERROR", details=details)


class CircuitExecutionError(QuantumAPIError):
    """Circuit execution error"""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, status_code=422, error_code="CIRCUIT_EXECUTION_ERROR", details=details)


class IBMQuantumError(QuantumAPIError):
    """IBM Quantum API error"""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, status_code=502, error_code="IBM_QUANTUM_ERROR", details=details)


class CacheError(QuantumAPIError):
    """Cache operation error"""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, status_code=503, error_code="CACHE_ERROR", details=details)


class WorkerPoolError(QuantumAPIError):
    """Worker pool error"""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, status_code=503, error_code="WORKER_POOL_ERROR", details=details)


def generate_error_response(
    error: Exception,
    request: Request,
    status_code: int = 500,
    error_code: Optional[str] = None,
    include_traceback: bool = False
) -> JSONResponse:
    """Generate standardized error response"""
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    timestamp = time.time()
    
    error_data = {
        "success": False,
        "error": {
            "code": error_code or "INTERNAL_ERROR",
            "message": str(error),
            "request_id": request_id,
            "timestamp": timestamp,
            "path": str(request.url.path),
            "method": request.method
        }
    }
    
    # Add traceback in development mode
    if include_traceback or config.debug:
        error_data["error"]["traceback"] = traceback.format_exc().split("\n")
    
    # Add details if available
    if hasattr(error, "details") and error.details:
        error_data["error"]["details"] = error.details
    
    # Log the error
    container.logger().error(
        "api_error",
        error_code=error_code or "INTERNAL_ERROR",
        message=str(error),
        request_id=request_id,
        path=request.url.path,
        method=request.method,
        status_code=status_code
    )
    
    return JSONResponse(
        status_code=status_code,
        content=error_data,
        headers={"X-Request-ID": request_id}
    )


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Handle HTTP exceptions"""
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    
    error_data = {
        "success": False,
        "error": {
            "code": "HTTP_ERROR",
            "message": exc.detail,
            "request_id": request_id,
            "timestamp": time.time(),
            "path": str(request.url.path),
            "method": request.method,
            "status_code": exc.status_code
        }
    }
    
    container.logger().warning(
        "http_exception",
        status_code=exc.status_code,
        detail=exc.detail,
        request_id=request_id,
        path=request.url.path
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content=error_data,
        headers={"X-Request-ID": request_id}
    )


async def validation_exception_handler(request: Request, exc) -> JSONResponse:
    """Handle Pydantic validation errors"""
    from fastapi.exceptions import RequestValidationError
    
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    
    errors = []
    if isinstance(exc, RequestValidationError):
        for error in exc.errors():
            errors.append({
                "field": ".".join(str(loc) for loc in error["loc"]),
                "message": error["msg"],
                "type": error["type"]
            })
    
    error_data = {
        "success": False,
        "error": {
            "code": "VALIDATION_ERROR",
            "message": "Request validation failed",
            "request_id": request_id,
            "timestamp": time.time(),
            "path": str(request.url.path),
            "method": request.method,
            "validation_errors": errors
        }
    }
    
    container.logger().warning(
        "validation_error",
        errors=errors,
        request_id=request_id,
        path=request.url.path
    )
    
    return JSONResponse(
        status_code=422,
        content=error_data,
        headers={"X-Request-ID": request_id}
    )


async def quantum_api_error_handler(request: Request, exc: QuantumAPIError) -> JSONResponse:
    """Handle QuantumAPIError exceptions"""
    return generate_error_response(
        exc,
        request,
        status_code=exc.status_code,
        error_code=exc.error_code,
        include_traceback=config.debug
    )


async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle all unhandled exceptions"""
    # Don't handle HTTPException here - it has its own handler
    if isinstance(exc, HTTPException):
        raise exc
    
    # Don't handle Pydantic ValidationError here - it has its own handler
    from pydantic import ValidationError as PydanticValidationError
    if isinstance(exc, PydanticValidationError):
        raise exc
    
    # Handle QuantumAPIError
    if isinstance(exc, QuantumAPIError):
        return await quantum_api_error_handler(request, exc)
    
    # Handle all other exceptions
    return generate_error_response(
        exc,
        request,
        status_code=500,
        error_code="INTERNAL_ERROR",
        include_traceback=config.debug
    )


async def not_found_handler(request: Request, exc) -> JSONResponse:
    """Handle 404 Not Found errors"""
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    
    error_data = {
        "success": False,
        "error": {
            "code": "NOT_FOUND",
            "message": f"Endpoint not found: {request.url.path}",
            "request_id": request_id,
            "timestamp": time.time(),
            "path": str(request.url.path),
            "method": request.method
        }
    }
    
    container.logger().warning(
        "endpoint_not_found",
        path=request.url.path,
        method=request.method,
        request_id=request_id
    )
    
    return JSONResponse(
        status_code=404,
        content=error_data,
        headers={"X-Request-ID": request_id}
    )


def setup_error_handlers(app):
    """Setup all error handlers for the FastAPI app"""
    from fastapi.exceptions import RequestValidationError
    
    # Add request ID middleware
    @app.middleware("http")
    async def add_request_id(request: Request, call_next):
        request.state.request_id = str(uuid.uuid4())
        response = await call_next(request)
        response.headers["X-Request-ID"] = request.state.request_id
        return response
    
    # Register exception handlers
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(QuantumAPIError, quantum_api_error_handler)
    app.add_exception_handler(Exception, global_exception_handler)
    app.add_exception_handler(404, not_found_handler)
    
    return app
