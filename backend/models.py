"""
Pydantic models for request/response validation
"""
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field, validator
from enum import Enum
from config import config


class BackendType(str, Enum):
    LOCAL = "local"
    AER_SIMULATOR = "aer_simulator"
    CUSTOM_SIMULATOR = "custom_simulator"
    WASM = "wasm"
    IBM_QUANTUM = "ibm_quantum"


class QuantumGate(BaseModel):
    """Quantum gate model"""
    name: str = Field(..., min_length=1, max_length=20)
    qubits: List[int] = Field(..., min_items=1, max_items=10)
    parameters: Optional[List[float]] = Field(default=None, max_items=10)

    @validator('name')
    def validate_gate_name(cls, v):
        valid_gates = [
            'H', 'X', 'Y', 'Z', 'S', 'T', 'RX', 'RY', 'RZ',
            'CNOT', 'CX', 'CY', 'CZ', 'CH', 'CP', 'SWAP', 'CCNOT', 'CCX', 'TOFFOLI',
            'FREDKIN', 'CSWAP', 'P', 'PHASE', 'U', 'U3', 'U1', 'U2', 'SDG', 'TDG',
            'SX', 'SXDG', 'SQRTX', 'SQRTZ', 'ID', 'MEASURE',
            'CRX', 'CRY', 'CRZ', 'RXX', 'RYY', 'RZZ'
        ]
        if v.upper() not in valid_gates:
            raise ValueError(f'Invalid gate name: {v}')
        return v.upper()

    @validator('qubits')
    def validate_qubits(cls, v):
        if len(set(v)) != len(v):
            raise ValueError('Duplicate qubit indices not allowed')
        return v


class QuantumCircuit(BaseModel):
    """Quantum circuit model"""
    numQubits: int = Field(..., ge=1, le=config.quantum.max_qubits)
    gates: List[QuantumGate] = Field(..., max_items=config.quantum.max_gates)

    @validator('gates')
    def validate_circuit_size(cls, v):
        total_qubits_used = set()
        for gate in v:
            total_qubits_used.update(gate.qubits)

        if len(total_qubits_used) > config.quantum.max_qubits:
            raise ValueError(f'Circuit uses too many qubits: {len(total_qubits_used)} > {config.quantum.max_qubits}')

        return v


class QuantumExecutionOptions(BaseModel):
    """Execution options model"""
    backend: BackendType = BackendType.LOCAL
    shots: int = Field(config.quantum.default_shots, ge=1, le=config.quantum.max_shots)
    initial_state: Optional[str] = Field(default="ket0", pattern=r'^(ket0|ket1|\+|\-)$')
    custom_state: Optional[Dict[str, Any]] = None
    optimization_level: int = Field(1, ge=0, le=3)
    enable_transpilation: bool = True
    backend_name: Optional[str] = None


class QuantumExecutionRequest(BaseModel):
    """Circuit execution request model"""
    circuit: QuantumCircuit
    backend: BackendType = BackendType.LOCAL
    shots: int = Field(config.quantum.default_shots, ge=1, le=config.quantum.max_shots)
    initialState: Optional[str] = Field(default="ket0", pattern=r'^(ket0|ket1|\+|\-)$')
    customState: Optional[Dict[str, Any]] = None
    token: Optional[str] = None


class QuantumExecutionResult(BaseModel):
    """Circuit execution result model"""
    success: bool
    method: str
    backend: str
    executionTime: float
    qubitResults: Optional[List[Dict[str, Any]]] = None
    jobId: Optional[str] = None
    status: Optional[str] = None
    message: Optional[str] = None
    error: Optional[str] = None


class IBMConnectRequest(BaseModel):
    """IBM Quantum connection request"""
    token: str = Field(..., min_length=10)


class IBMConnectResponse(BaseModel):
    """IBM Quantum connection response"""
    success: bool
    hub: Optional[str] = None
    error: Optional[str] = None


class IBMBackendsResponse(BaseModel):
    """IBM Quantum backends response"""
    success: bool
    backends: List[Dict[str, Any]] = []
    error: Optional[str] = None


class IBMExecuteRequest(BaseModel):
    """IBM Quantum execution request"""
    token: str
    backend: str
    circuit: QuantumCircuit
    shots: int = Field(config.quantum.default_shots, ge=1, le=config.quantum.max_shots)
    instance: Optional[str] = None  # CRN for IBM Cloud users


class IBMExecuteResponse(BaseModel):
    """IBM Quantum execution response"""
    success: bool
    jobId: Optional[str] = None
    status: Optional[str] = None
    error: Optional[str] = None
    qasm: Optional[str] = None  # Single line QASM code


class IBMJobStatusResponse(BaseModel):
    """IBM Quantum job status response"""
    success: bool
    jobId: str
    status: str
    statusMessage: str
    progress: float
    estimatedTime: Optional[float] = None
    results: Optional[Any] = None
    error: Optional[str] = None


class AIQuestionRequest(BaseModel):
    """AI question request"""
    question: str = Field(..., min_length=1, max_length=1000)


class AIQuestionResponse(BaseModel):
    """AI question response"""
    success: bool
    question: str
    answer: str
    timestamp: str


class CacheStatsResponse(BaseModel):
    """Cache statistics response"""
    success: bool
    cache: Dict[str, Any]


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    timestamp: float
    services: Dict[str, Any]


class QuantumMLFeatureMapRequest(BaseModel):
    """Quantum ML feature map request"""
    type: str = Field(..., pattern=r'^(z|zz|amplitude)$')
    numQubits: int = Field(2, ge=1, le=10)
    data: List[List[float]]


class QuantumMLKernelRequest(BaseModel):
    """Quantum ML kernel request"""
    type: str = Field(..., pattern=r'^(fidelity|projected)$')
    featureMap: str = Field(..., pattern=r'^(z|zz)$')
    x1: List[float]
    x2: List[float]


class QuantumMLVQCTrainRequest(BaseModel):
    """VQC training request"""
    featureMap: str = Field(..., pattern=r'^(z|zz)$')
    numQubits: int = Field(2, ge=1, le=10)
    variationalLayers: int = Field(1, ge=1, le=5)
    trainingData: List[List[float]]
    labels: List[int]
    maxIterations: int = Field(100, ge=1, le=1000)


class QuantumMLVQCPredictRequest(BaseModel):
    """VQC prediction request"""
    parameters: List[float]
    featureMap: str = Field(..., pattern=r'^(z|zz)$')
    numQubits: int = Field(2, ge=1, le=10)
    inputData: List[float]


class DatasetGenerateRequest(BaseModel):
    """Dataset generation request"""
    type: str = Field(..., pattern=r'^(classification|regression)$')
    subtype: str = Field(..., pattern=r'^(circles|moons|blobs|gaussian)$')
    numSamples: int = Field(100, ge=10, le=10000)


class DatasetGenerateResponse(BaseModel):
    """Dataset generation response"""
    success: bool
    dataset: List[Dict[str, Any]]
    type: str
    subtype: str
    numSamples: int


class MedicalLoadRequest(BaseModel):
    """Medical dataset load request"""
    url: str


class MedicalAnalyzeRequest(BaseModel):
    """Medical analysis request"""
    patientData: Dict[str, Any]


class IBMCloudAuthRequest(BaseModel):
    """IBM Cloud authentication request"""
    apiKey: str
    instance: Optional[str] = None  # CRN/Instance ID


class WatsonXAuthRequest(BaseModel):
    """watsonx.ai authentication request"""
    apiKey: str
    projectId: Optional[str] = None

class QuantumStudyRequest(BaseModel):
    """Quantum advantage study request"""
    algorithmType: str
    circuit: QuantumCircuit
    token: str
    backend: str
    useWatsonX: bool = True

class QuantumStudyResponse(BaseModel):
    """Quantum advantage study response"""
    success: bool
    jobId: Optional[str] = None
    optimization: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

class QuantumReportResponse(BaseModel):
    """Quantum research report response"""
    success: bool
    report: str
    format: str = "markdown"

class ErrorResponse(BaseModel):
    """Standard error response"""
    error: str
    message: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
