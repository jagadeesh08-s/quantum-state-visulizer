import os
import traceback
from typing import Dict, List, Any, Optional

try:
    from qiskit_ibm_runtime import QiskitRuntimeService, SamplerV2, Options
    SAMPLER_V2_AVAILABLE = True
except ImportError as e:
    raise ImportError("qiskit-ibm-runtime not installed. Install with: pip install qiskit-ibm-runtime") from e

from qiskit import transpile
from circuit_converter import json_to_quantum_circuit

class IBMQuantumService:
    def __init__(self):
        self.services: Dict[str, QiskitRuntimeService] = {}
        self.service_configs: Dict[str, Dict[str, Any]] = {}
        self.services: Dict[str, QiskitRuntimeService] = {}
        self.service_configs: Dict[str, Dict[str, Any]] = {}
        self.token_map: Dict[str, Dict[str, str]] = {}  # Maps BearerToken -> {key: API Key, instance: CRN}

    def register_cloud_token(self, bearer_token: str, api_key: str, instance: Optional[str] = None):
        """Register a bearer token with its underlying API key and optional instance"""
        self.token_map[bearer_token] = {"key": api_key, "instance": instance}

    def _detect_channel(self, token: str) -> tuple[str, Optional[str]]:
        if len(token) > 100:
            return "ibm_cloud", None
        return "ibm_quantum_platform", None

    def get_service(self, token: str, channel: Optional[str] = None, instance: Optional[str] = None) -> QiskitRuntimeService:
        cache_key = f"{token}:{channel}:{instance}"
        if cache_key not in self.services:
            if not channel:
                channel, instance = self._detect_channel(token)
            
            # Resolve API Key and Instance from mapping map if this is a Bearer Token
            mapped_data = self.token_map.get(token, {})
            real_token = mapped_data.get("key", token)
            
            # If instance wasn't provided but we have it cached for this token, use it
            if not instance and mapped_data.get("instance"):
                instance = mapped_data.get("instance")
                # Also force channel to cloud if we found an instance
                if not channel:
                    channel = "ibm_cloud"

            print(f"Initializing IBM Service: {token[:10]}... (Instance: {instance})")
            try:
                if channel == "ibm_cloud" and instance:
                    # Qiskit for Cloud requires the API Key, not the Bearer Token
                    self.services[cache_key] = QiskitRuntimeService(channel="ibm_cloud", token=real_token, instance=instance)
                else:
                    self.services[cache_key] = QiskitRuntimeService(channel="ibm_quantum_platform", token=real_token)
                self.service_configs[token] = {"channel": channel, "instance": instance}
            except Exception as e:
                print(f"Service creation failed: {e}")
                raise
        return self.services[cache_key]

    async def validate_token(self, token: str, channel: Optional[str] = None, instance: Optional[str] = None):
        try:
            if not token:
                token = os.getenv("IBM_QUANTUM_TOKEN")
            if not token or len(token) < 10:
                return {"success": False, "error": "Token too short"}
            service = self.get_service(token, channel, instance)
            account = service.active_account()
            if not account:
                return {"success": False, "error": "No account info"}
            hub = account.get("hub", "default")
            return {"success": True, "hub": hub}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def get_backends(self, token: str):
        try:
            if not token:
                token = os.getenv("IBM_QUANTUM_TOKEN")
            service = self.get_service(token)
            backends = service.backends()
            backend_list = []
            for b in backends:
                try:
                    backend_list.append({
                        "id": b.name,
                        "name": b.name,
                        "qubits": b.num_qubits,
                        "status": "online",
                        "type": "processor" if not b.simulator else "simulator"
                    })
                except: continue
            return {"success": True, "backends": backend_list}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def submit_job(self, token: str, backend_name: str, circuit_json: Dict[str, Any], shots: int = 1024, instance: Optional[str] = None):
        try:
            if not token:
                token = os.getenv("IBM_QUANTUM_TOKEN")
            
            # Use provided instance or detect from token
            channel = None
            if instance or len(token) > 100:
                channel = "ibm_cloud"
            
            service = self.get_service(token, channel=channel, instance=instance)
            qc = json_to_quantum_circuit(circuit_json)
            qc.measure_all()
            
            # Serialize to "single line" QASM for tracking/transparency
            from qiskit import qasm2
            qasm_str = qasm2.dumps(qc).replace('\n', ' ')
            print(f"Serialized Circuit (QASM): {qasm_str[:100]}...")
            
            backend = service.backend(backend_name)
            transpiled_qc = transpile(qc, backend=backend, optimization_level=1)
            
            # SamplerV2 requires 'mode' (which accepts a Backend)
            sampler = SamplerV2(mode=backend)
            job = sampler.run([transpiled_qc], shots=shots)
            
            return {
                "success": True, 
                "jobId": job.job_id(), 
                "status": job.status(),
                "qasm": qasm_str  # Return the "single line code" to the user
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def get_serialized_circuit(self, circuit_json: Dict[str, Any]) -> str:
        """Convert circuit JSON to single line QASM string"""
        try:
            qc = json_to_quantum_circuit(circuit_json)
            from qiskit import qasm2
            return qasm2.dumps(qc).replace('\n', ' ')
        except Exception as e:
            return f"Error: {str(e)}"

    async def get_job_result(self, token: str, job_id: str, instance: Optional[str] = None):
        try:
            if not token:
                token = os.getenv("IBM_QUANTUM_TOKEN")
            service = self.get_service(token)
            job = service.job(job_id)
            status = job.status()
            if hasattr(status, 'name'):
                status = status.name
            
            if status == "DONE":
                result = job.result()
                # SamplerV2 result format handler
                try:
                    # SamplerV2 returns a PrimitiveResult with PubResults
                    # Each PubResult has a 'data' attribute containing the bitstrings
                    pub_result = result[0]
                    # Get counts from the classical register (measure_all uses 'meas' by default)
                    # We can use .get_counts() or access the bitstrings directly
                    if hasattr(pub_result.data, 'meas'):
                        counts = pub_result.data.meas.get_counts()
                    else:
                        # Fallback: try to find any bitstring data
                        reg_name = list(pub_result.data.keys())[0] if pub_result.data else 'meas'
                        counts = getattr(pub_result.data, reg_name).get_counts()
                    
                    # Convert to normalized quasi-distribution for consistency
                    total_shots = sum(counts.values())
                    formatted_counts = {k: v/total_shots for k, v in counts.items()}
                    
                    return {
                        "success": True, 
                        "status": status, 
                        "results": formatted_counts, 
                        "jobId": job_id,
                        "statusMessage": "Job completed successfully",
                        "progress": 1.0
                    }
                except Exception as res_err:
                    print(f"Error parsing SamplerV2 result: {res_err}")
                    # Fallback for older Sampler or different format
                    if hasattr(result, 'quasi_dists'):
                        quasi_dist = result.quasi_dists[0]
                        formatted_counts = {format(k, 'b'): float(v) for k, v in quasi_dist.items()}
                        return {
                            "success": True, 
                            "status": status, 
                            "results": formatted_counts, 
                            "jobId": job_id,
                            "statusMessage": "Job completed successfully",
                            "progress": 1.0
                        }
                    raise res_err
            return {
                "success": True, 
                "status": status, 
                "jobId": job_id, 
                "statusMessage": f"Job is {status}", 
                "progress": 0.5
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def get_job_history(self, token: str, limit: int = 25):
        """Retrieve the latest jobs from IBM Quantum"""
        try:
            if not token:
                token = os.getenv("IBM_QUANTUM_TOKEN")
            service = self.get_service(token)
            
            # Retrieve jobs from the service (limit increased)
            jobs = service.jobs(limit=limit, desc=True)
            
            job_list = []
            for job in jobs:
                try:
                    # Safe status conversion
                    status = job.status()
                    if hasattr(status, 'name'):
                        status = status.name
                    elif hasattr(status, 'value'):
                        status = status.value
                    
                    # Safe backend name retrieval
                    backend_name = "unknown"
                    try:
                        backend_name = job.backend().name
                    except:
                        # Fallback for older jobs where backend might not be directly accessible
                        if hasattr(job, 'backend_name'):
                            backend_name = job.backend_name

                    job_list.append({
                        "jobId": job.job_id(),
                        "backend": backend_name,
                        "status": str(status),
                        "created": job.creation_date().isoformat() if hasattr(job.creation_date(), 'isoformat') else str(job.creation_date()),
                        "type": "SamplerV2"
                    })
                except Exception as b_err:
                    print(f"Error parsing job info: {b_err}")
                    continue
                    
            return {"success": True, "jobs": job_list}
        except Exception as e:
            print(f"Error fetching job history: {traceback.format_exc()}")
            return {"success": False, "error": str(e)}

ibm_service_instance = IBMQuantumService()
