"""
Security enhancements for Quantum Backend API
"""
from fastapi import Request, Response
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Optional, List, Any
import secrets
import hashlib
import hmac
import time
from config import config

# Lazy import to avoid circular dependency
def get_logger():
    from container import container
    return container.logger()


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses"""
    
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Relaxed Security headers for local network access
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "ALLOWALL"
        response.headers["X-XSS-Protection"] = "0"
        response.headers["Referrer-Policy"] = "no-referrer-when-downgrade"
        
        # Permissive CSP for local network development
        csp = (
            "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; "
            "connect-src * 'unsafe-inline'; "
            "frame-ancestors *;"
        )
        response.headers["Content-Security-Policy"] = csp
        
        # HSTS (only in production)
        if config.is_production():
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        
        return response


class RateLimitHeadersMiddleware(BaseHTTPMiddleware):
    """Add rate limit information to response headers"""
    
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Add rate limit headers if available
        if hasattr(request.state, "rate_limit_remaining"):
            response.headers["X-RateLimit-Remaining"] = str(request.state.rate_limit_remaining)
        if hasattr(request.state, "rate_limit_reset"):
            response.headers["X-RateLimit-Reset"] = str(request.state.rate_limit_reset)
        
        return response


def sanitize_input(data: Any, max_length: int = 10000) -> Any:
    """
    Sanitize user input to prevent injection attacks
    
    Args:
        data: Input data to sanitize
        max_length: Maximum allowed length
    
    Returns:
        Sanitized data
    """
    if isinstance(data, str):
        # Remove null bytes and control characters
        sanitized = "".join(char for char in data if ord(char) >= 32 or char in "\n\r\t")
        
        # Truncate if too long
        if len(sanitized) > max_length:
            sanitized = sanitized[:max_length]
            get_logger().warning("input_truncated", length=len(data), max_length=max_length)
        
        return sanitized
    
    elif isinstance(data, dict):
        return {key: sanitize_input(value, max_length) for key, value in data.items()}
    
    elif isinstance(data, list):
        return [sanitize_input(item, max_length) for item in data]
    
    return data


def generate_csrf_token() -> str:
    """Generate CSRF token"""
    return secrets.token_urlsafe(32)


def validate_csrf_token(token: str, session_token: str) -> bool:
    """Validate CSRF token"""
    return hmac.compare_digest(token, session_token)


class InputValidationMiddleware(BaseHTTPMiddleware):
    """Validate and sanitize input data"""
    
    def __init__(self, app, max_body_size: int = 10 * 1024 * 1024):  # 10MB default
        super().__init__(app)
        self.max_body_size = max_body_size
    
    async def dispatch(self, request: Request, call_next):
        # Check content length
        content_length = request.headers.get("content-length")
        if content_length:
            try:
                size = int(content_length)
                if size > self.max_body_size:
                    from fastapi import HTTPException
                    raise HTTPException(
                        status_code=413,
                        detail=f"Request body too large. Maximum size: {self.max_body_size} bytes"
                    )
            except ValueError:
                pass
        
        response = await call_next(request)
        return response


def setup_security_middleware(app):
    """Setup all security middleware"""
    # Security headers
    app.add_middleware(SecurityHeadersMiddleware)
    
    # Rate limit headers
    app.add_middleware(RateLimitHeadersMiddleware)
    
    # Input validation
    app.add_middleware(InputValidationMiddleware, max_body_size=10 * 1024 * 1024)
    
    # Trusted hosts (if configured)
    if config.api.trusted_hosts:
        app.add_middleware(
            TrustedHostMiddleware,
            allowed_hosts=config.api.trusted_hosts
        )
    
    get_logger().info("security_middleware_configured")
