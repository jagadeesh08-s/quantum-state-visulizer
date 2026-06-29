"""
Rate limiting and request throttling for Quantum Backend
"""
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.middleware import SlowAPIMiddleware
from slowapi.errors import RateLimitExceeded
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
import time
from typing import Dict, Any
from config import config


# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)


def create_rate_limit_middleware():
    """Create rate limiting middleware"""
    return SlowAPIMiddleware


async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    """Handle rate limit exceeded errors"""
    return JSONResponse(
        status_code=429,
        content={
            "error": "Rate limit exceeded",
            "message": f"Too many requests. Limit: {exc.detail}",
            "retry_after": int(exc.retry_after) if hasattr(exc, 'retry_after') else 60
        }
    )


class QuantumRateLimiter:
    """Advanced rate limiting for quantum operations"""

    def __init__(self):
        self.requests: Dict[str, list] = {}
        self.ibm_requests: Dict[str, list] = {}

    def _cleanup_old_requests(self, request_log: Dict[str, list], window: int):
        """Clean up requests outside the time window"""
        current_time = time.time()
        cutoff_time = current_time - window

        for ip in list(request_log.keys()):
            request_log[ip] = [t for t in request_log[ip] if t > cutoff_time]
            if not request_log[ip]:
                del request_log[ip]

    def check_rate_limit(self, ip: str, max_requests: int, window: int) -> bool:
        """Check if request is within rate limits"""
        self._cleanup_old_requests(self.requests, window)

        if ip not in self.requests:
            self.requests[ip] = []

        current_time = time.time()
        self.requests[ip].append(current_time)

        return len(self.requests[ip]) <= max_requests

    def check_ibm_rate_limit(self, ip: str) -> bool:
        """Check IBM Quantum specific rate limits"""
        window = 60  # 1 minute
        max_requests = config.ibm_quantum.rate_limit

        self._cleanup_old_requests(self.ibm_requests, window)

        if ip not in self.ibm_requests:
            self.ibm_requests[ip] = []

        current_time = time.time()
        self.ibm_requests[ip].append(current_time)

        return len(self.ibm_requests[ip]) <= max_requests

    def get_remaining_requests(self, ip: str, max_requests: int, window: int) -> int:
        """Get remaining requests for IP"""
        self._cleanup_old_requests(self.requests, window)
        current_requests = len(self.requests.get(ip, []))
        return max(0, max_requests - current_requests)

    def get_reset_time(self, ip: str, window: int) -> float:
        """Get time until rate limit resets"""
        if ip not in self.requests or not self.requests[ip]:
            return 0

        oldest_request = min(self.requests[ip])
        reset_time = oldest_request + window - time.time()
        return max(0, reset_time)


# Global rate limiter instance
quantum_rate_limiter = QuantumRateLimiter()


async def quantum_rate_limit_middleware(request: Request, call_next):
    """Custom middleware for quantum-specific rate limiting"""
    client_ip = get_remote_address(request)

    # Check general API rate limits
    if not quantum_rate_limiter.check_rate_limit(
        client_ip,
        config.api.rate_limit_requests,
        config.api.rate_limit_window
    ):
        remaining = quantum_rate_limiter.get_remaining_requests(
            client_ip,
            config.api.rate_limit_requests,
            config.api.rate_limit_window
        )
        reset_time = quantum_rate_limiter.get_reset_time(
            client_ip,
            config.api.rate_limit_window
        )

        return JSONResponse(
            status_code=429,
            content={
                "error": "API rate limit exceeded",
                "message": f"Too many requests. Remaining: {remaining}",
                "retry_after": int(reset_time),
                "limit": config.api.rate_limit_requests,
                "window": config.api.rate_limit_window
            }
        )

    # Special rate limiting for IBM Quantum endpoints
    if request.url.path.startswith("/api/ibm/"):
        if not quantum_rate_limiter.check_ibm_rate_limit(client_ip):
            return JSONResponse(
                status_code=429,
                content={
                    "error": "IBM Quantum rate limit exceeded",
                    "message": "Too many IBM Quantum requests. Please wait before retrying.",
                    "retry_after": 60,
                    "limit": config.ibm_quantum.rate_limit,
                    "window": 60
                }
            )

    # Continue with request
    response = await call_next(request)
    return response


# Rate limit decorators for specific endpoints
def limit_general_requests():
    """Decorator for general API rate limiting"""
    return limiter.limit(f"{config.api.rate_limit_requests}/minute")


def limit_ibm_requests():
    """Decorator for IBM Quantum specific rate limiting"""
    return limiter.limit("10/minute")


def limit_simulation_requests():
    """Decorator for simulation endpoints"""
    return limiter.limit("10/minute")  # More restrictive for simulations