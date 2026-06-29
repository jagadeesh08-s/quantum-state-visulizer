"""
Local Simulator Service — replaces IBM Quantum cloud connectivity.
Provides the same interface as IBMQuantumService but executes entirely
on the local Qiskit/Aer simulator. No external network calls are made.
"""
import time
import uuid
import logging
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)

# Local simulator backends available
LOCAL_BACKENDS = [
    {
        "id": "aer_simulator",
        "name": "aer_simulator",
        "qubits": 32,
        "status": "online",
        "type": "simulator",
        "description": "High-performance local Aer statevector/QASM simulator",
    },
    {
        "id": "statevector_simulator",
        "name": "statevector_simulator",
        "qubits": 30,
        "status": "online",
        "type": "simulator",
        "description": "Exact statevector simulation (no sampling noise)",
    },
    {
        "id": "qasm_simulator",
        "name": "qasm_simulator",
        "qubits": 32,
        "status": "online",
        "type": "simulator",
        "description": "QASM-based shot sampling simulator",
    },
]

# In-memory job store for the session
_jobs: Dict[str, Dict[str, Any]] = {}


class LocalSimulatorService:
    """
    Drop-in replacement for IBMQuantumService.
    All execution is local — no IBM Quantum Runtime or cloud calls.
    """

    def __init__(self):
        self._authenticated = True  # Always "authenticated" locally

    async def validate_token(self, token: str, channel: Optional[str] = None, instance: Optional[str] = None):
        """Always succeeds in local mode — no token required."""
        logger.info("local_simulator_validate_token: always succeeds")
        return {
            "success": True,
            "hub": "local",
            "mode": "local_simulator",
            "message": "Local simulator — no IBM token required",
        }

    async def get_backends(self, token: str):
        """Return the list of available local simulator backends."""
        logger.info("local_simulator_get_backends")
        return {
            "success": True,
            "backends": LOCAL_BACKENDS,
            "mode": "local_simulator",
        }

    async def submit_job(
        self,
        token: str,
        backend_name: str,
        circuit_json: Dict[str, Any],
        shots: int = 1024,
        instance: Optional[str] = None,
    ):
        """
        Execute the circuit locally using the Aer simulator.
        Returns a job-like result immediately (synchronous local execution).
        """
        job_id = str(uuid.uuid4())
        logger.info("local_simulator_submit_job", extra={"backend": backend_name, "shots": shots})

        try:
            from circuit_converter import json_to_quantum_circuit
            from qiskit import transpile
            from qiskit_aer import AerSimulator

            qc = json_to_quantum_circuit(circuit_json)
            qc.measure_all()

            # Select the requested backend (all map to AerSimulator)
            simulator = AerSimulator()
            transpiled = transpile(qc, backend=simulator, optimization_level=1)

            job = simulator.run(transpiled, shots=shots)
            result = job.result()
            counts = result.get_counts()

            # Normalize to probabilities
            total = sum(counts.values())
            probabilities = {k: v / total for k, v in counts.items()}

            job_record = {
                "jobId": job_id,
                "backend": backend_name,
                "status": "DONE",
                "results": probabilities,
                "shots": shots,
                "created": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "mode": "local_simulator",
            }
            _jobs[job_id] = job_record

            return {
                "success": True,
                "jobId": job_id,
                "status": "DONE",
                "results": probabilities,
                "mode": "local_simulator",
            }

        except Exception as e:
            logger.error("local_simulator_submit_job_error", exc_info=True)
            error_record = {
                "jobId": job_id,
                "backend": backend_name,
                "status": "ERROR",
                "error": str(e),
                "created": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "mode": "local_simulator",
            }
            _jobs[job_id] = error_record
            return {"success": False, "error": str(e), "jobId": job_id}

    def get_serialized_circuit(self, circuit_json: Dict[str, Any]) -> str:
        """Convert circuit JSON to single-line QASM string."""
        try:
            from circuit_converter import json_to_quantum_circuit
            from qiskit import qasm2

            qc = json_to_quantum_circuit(circuit_json)
            return qasm2.dumps(qc).replace("\n", " ")
        except Exception as e:
            return f"Error: {str(e)}"

    async def get_job_result(self, token: str, job_id: str, instance: Optional[str] = None):
        """Retrieve a previously executed local job result."""
        record = _jobs.get(job_id)
        if not record:
            return {"success": False, "error": f"Job {job_id} not found"}

        return {
            "success": True,
            "status": record.get("status", "UNKNOWN"),
            "results": record.get("results"),
            "jobId": job_id,
            "statusMessage": "Local job completed",
            "progress": 1.0,
            "mode": "local_simulator",
        }

    async def get_job_history(self, token: str, limit: int = 25):
        """Return recent local jobs."""
        jobs = list(_jobs.values())
        jobs.sort(key=lambda j: j.get("created", ""), reverse=True)
        return {
            "success": True,
            "jobs": jobs[:limit],
            "mode": "local_simulator",
        }


# Singleton — used throughout main.py
ibm_service_instance = LocalSimulatorService()
