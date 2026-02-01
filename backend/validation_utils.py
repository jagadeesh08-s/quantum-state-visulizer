"""
Enhanced validation utilities for quantum backend API endpoints.
Provides comprehensive input validation without modifying core quantum algorithms.
"""

import re
from typing import Dict, Any, List, Optional, Tuple
from pydantic import BaseModel, ValidationError, validator
import logging

logger = logging.getLogger(__name__)

# ============================================================================
# Data Models for Validation
# ============================================================================

class GateValidationModel(BaseModel):
    """Pydantic model for gate validation"""
    name: str
    qubits: List[int]
    parameters: Optional[List[float]] = None

    @validator('name')
    def validate_gate_name(cls, v):
        if not v or not isinstance(v, str) or len(v.strip()) == 0:
            raise ValueError('Gate name is required')
        return v.strip()

    @validator('qubits')
    def validate_qubits(cls, v):
        if not isinstance(v, list) or len(v) == 0:
            raise ValueError('Gate must have at least one qubit')
        for qubit in v:
            if not isinstance(qubit, int) or qubit < 0:
                raise ValueError(f'Invalid qubit index: {qubit}')
        return v

    @validator('parameters')
    def validate_parameters(cls, v):
        if v is not None and not isinstance(v, list):
            raise ValueError('Parameters must be a list of floats')
        return v

class CircuitValidationModel(BaseModel):
    """Pydantic model for circuit validation"""
    numQubits: int
    gates: List[GateValidationModel]

    @validator('numQubits')
    def validate_num_qubits(cls, v):
        if not isinstance(v, int) or v < 1 or v > 100:
            raise ValueError('numQubits must be an integer between 1 and 100')
        return v

class QuantumExecutionValidationModel(BaseModel):
    """Pydantic model for quantum execution validation"""
    circuit: CircuitValidationModel
    backend: str
    shots: Optional[int] = 1024
    token: Optional[str] = None
    initialState: Optional[str] = None
    customState: Optional[Any] = None

    @validator('backend')
    def validate_backend(cls, v):
        valid_backends = [
            'local', 'aer_simulator', 'custom_simulator', 'wasm',
            'statevector', 'simulator_statevector', 'simulator_mps'
        ]
        if v not in valid_backends:
            raise ValueError(f'Invalid backend: {v}. Must be one of: {valid_backends}')
        return v

    @validator('shots')
    def validate_shots(cls, v):
        if v is not None and (not isinstance(v, int) or v < 1 or v > 100000):
            raise ValueError('shots must be an integer between 1 and 100000')
        return v

    @validator('initialState')
    def validate_initial_state(cls, v):
        if v is not None:
            valid_states = ['ket0', 'ket1', 'plus', 'minus', 'zero', 'uniform']
            if v not in valid_states:
                raise ValueError(f'Invalid initialState: {v}. Must be one of: {valid_states}')
        return v

class IBMExecutionValidationModel(BaseModel):
    """Pydantic model for IBM execution validation"""
    token: str
    backend: str
    circuit: CircuitValidationModel
    shots: int = 1024
    instance: Optional[str] = None

    @validator('token')
    def validate_token(cls, v):
        if not v or not isinstance(v, str) or len(v.strip()) == 0:
            raise ValueError('Valid IBM Quantum token is required')
        return v.strip()

    @validator('backend')
    def validate_ibm_backend(cls, v):
        if not v or not isinstance(v, str):
            raise ValueError('Valid backend name is required')
        return v.strip()

    @validator('shots')
    def validate_ibm_shots(cls, v):
        if not isinstance(v, int) or v < 1 or v > 8192:
            raise ValueError('shots must be an integer between 1 and 8192 for IBM Quantum')
        return v

    @validator('instance')
    def validate_instance(cls, v):
        if v is not None:
            # Basic instance format validation (hub/group/project)
            if not re.match(r'^[a-zA-Z0-9_-]+/[a-zA-Z0-9_-]+/[a-zA-Z0-9_-]+$', v):
                raise ValueError('instance must be in format: hub/group/project')
        return v

# ============================================================================
# Validation Functions
# ============================================================================

def validate_circuit_data(circuit_data: Dict[str, Any]) -> Tuple[bool, str, Dict[str, Any]]:
    """
    Comprehensive circuit validation.

    Args:
        circuit_data: Raw circuit data from request

    Returns:
        Tuple of (is_valid, error_message, validated_data)
    """
    try:
        # Use Pydantic for structured validation
        validated = CircuitValidationModel(**circuit_data)
        return True, "", validated.dict()

    except ValidationError as e:
        error_msg = f"Circuit validation failed: {e}"
        logger.warning(f"Circuit validation error: {error_msg}")
        return False, error_msg, {}

    except Exception as e:
        error_msg = f"Unexpected circuit validation error: {str(e)}"
        logger.error(f"Unexpected circuit validation error: {error_msg}")
        return False, error_msg, {}

def validate_quantum_execution_request(request_data: Dict[str, Any]) -> Tuple[bool, str, Dict[str, Any]]:
    """
    Validate quantum execution request.

    Args:
        request_data: Raw execution request data

    Returns:
        Tuple of (is_valid, error_message, validated_data)
    """
    try:
        validated = QuantumExecutionValidationModel(**request_data)
        return True, "", validated.dict()

    except ValidationError as e:
        error_msg = f"Execution request validation failed: {e}"
        logger.warning(f"Execution validation error: {error_msg}")
        return False, error_msg, {}

    except Exception as e:
        error_msg = f"Unexpected execution validation error: {str(e)}"
        logger.error(f"Unexpected execution validation error: {error_msg}")
        return False, error_msg, {}

def validate_ibm_execution_request(request_data: Dict[str, Any]) -> Tuple[bool, str, Dict[str, Any]]:
    """
    Validate IBM Quantum execution request.

    Args:
        request_data: Raw IBM execution request data

    Returns:
        Tuple of (is_valid, error_message, validated_data)
    """
    try:
        validated = IBMExecutionValidationModel(**request_data)
        return True, "", validated.dict()

    except ValidationError as e:
        error_msg = f"IBM execution request validation failed: {e}"
        logger.warning(f"IBM execution validation error: {error_msg}")
        return False, error_msg, {}

    except Exception as e:
        error_msg = f"Unexpected IBM execution validation error: {str(e)}"
        logger.error(f"Unexpected IBM execution validation error: {error_msg}")
        return False, error_msg, {}

def validate_token_format(token: str) -> bool:
    """
    Basic token format validation.

    Args:
        token: Token string to validate

    Returns:
        True if token format is valid
    """
    if not token or not isinstance(token, str):
        return False

    # IBM tokens are typically long base64-like strings
    token = token.strip()
    if len(token) < 20:
        return False

    # Check for basic token characteristics (not comprehensive security validation)
    return bool(re.match(r'^[a-zA-Z0-9_-]+$', token))

def validate_job_id_format(job_id: str) -> bool:
    """
    Validate job ID format.

    Args:
        job_id: Job ID string to validate

    Returns:
        True if job ID format is valid
    """
    if not job_id or not isinstance(job_id, str):
        return False

    job_id = job_id.strip()
    # Job IDs are typically UUID-like or contain alphanumeric characters
    return bool(re.match(r'^[a-zA-Z0-9_-]+$', job_id))

def sanitize_string_input(input_str: str, max_length: int = 1000) -> str:
    """
    Sanitize string input by trimming and limiting length.

    Args:
        input_str: Input string to sanitize
        max_length: Maximum allowed length

    Returns:
        Sanitized string
    """
    if not isinstance(input_str, str):
        return ""

    sanitized = input_str.strip()
    if len(sanitized) > max_length:
        sanitized = sanitized[:max_length]
        logger.warning(f"Input string truncated to {max_length} characters")

    return sanitized

def validate_numeric_range(value: Any, min_val: float, max_val: float, field_name: str) -> Tuple[bool, str]:
    """
    Validate that a numeric value is within a specified range.

    Args:
        value: Value to validate
        min_val: Minimum allowed value
        max_val: Maximum allowed value
        field_name: Name of the field for error messages

    Returns:
        Tuple of (is_valid, error_message)
    """
    try:
        num_value = float(value)
        if num_value < min_val or num_value > max_val:
            return False, f"{field_name} must be between {min_val} and {max_val}"
        return True, ""
    except (ValueError, TypeError):
        return False, f"{field_name} must be a valid number"

# ============================================================================
# Rate Limiting Validation
# ============================================================================

def validate_rate_limit_exceeded(request_count: int, limit: int, window_seconds: int) -> bool:
    """
    Check if rate limit has been exceeded.

    Args:
        request_count: Number of requests in current window
        limit: Maximum allowed requests
        window_seconds: Time window in seconds

    Returns:
        True if limit exceeded
    """
    return request_count >= limit

# ============================================================================
# Error Response Builders
# ============================================================================

def build_validation_error_response(error_message: str, details: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Build a standardized validation error response.

    Args:
        error_message: Error message
        details: Additional error details

    Returns:
        Error response dictionary
    """
    response = {
        "success": False,
        "error": "VALIDATION_ERROR",
        "message": error_message
    }

    if details:
        response["details"] = details

    return response

def build_server_error_response(error_message: str, error_code: str = "INTERNAL_ERROR") -> Dict[str, Any]:
    """
    Build a standardized server error response.

    Args:
        error_message: Error message
        error_code: Error code identifier

    Returns:
        Error response dictionary
    """
    return {
        "success": False,
        "error": error_code,
        "message": error_message
    }

def build_rate_limit_error_response(retry_after: int) -> Dict[str, Any]:
    """
    Build a rate limit exceeded error response.

    Args:
        retry_after: Seconds until rate limit resets

    Returns:
        Error response dictionary
    """
    return {
        "success": False,
        "error": "RATE_LIMIT_EXCEEDED",
        "message": "Too many requests. Please try again later.",
        "retry_after": retry_after
    }