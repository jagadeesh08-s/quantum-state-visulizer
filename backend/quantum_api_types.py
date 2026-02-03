from enum import Enum
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List

class BackendType(str, Enum):
    LOCAL = "local"
    AER_SIMULATOR = "aer_simulator"
    CUSTOM_SIMULATOR = "custom_simulator"
    WASM = "wasm"
    IBM = "ibm"
    IBM_QUANTUM = "ibm_quantum"

class QuantumExecutionOptions(BaseModel):
    backend: BackendType
    token: Optional[str] = None
    shots: int = 1024
    initial_state: str = "ket0"
    custom_state: Optional[Dict[str, Any]] = None
    optimization_level: int = 1
    enable_transpilation: bool = True
    backend_name: str = "local"

class QuantumExecutionResult(BaseModel):
    success: bool
    method: str
    backend: str
    executionTime: float
    qubitResults: Optional[List[Dict[str, Any]]] = None
    jobId: Optional[str] = None
    status: Optional[str] = None
    message: Optional[str] = None
    error: Optional[str] = None
