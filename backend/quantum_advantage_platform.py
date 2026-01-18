from typing import Dict, Any, List, Optional
import time
from ibm_service import ibm_service_instance
from watsonx_service import watsonx_service
from container import container

class QuantumAdvantagePlatform:
    """
    Main hub for Quantum Research Platform
    Integrates IBM Quantum and watsonx.ai
    """
    
    def __init__(self):
        self.active_backends = {}

    async def connect_backend(self, token: str, backend_name: str) -> Dict[str, Any]:
        """Connect to IBM backend with automated validation"""
        try:
            result = await ibm_service_instance.validate_token(token)
            if not result.get("success"):
                return {"success": False, "error": "Invalid token"}
            
            self.active_backends[backend_name] = {
                "token": token,
                "connected_at": time.time()
            }
            return {"success": True, "message": f"Connected to {backend_name}"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def run_quantum_advantage_study(self, 
                                        algorithm_type: str, 
                                        circuit_data: Dict[str, Any], 
                                        token: str,
                                        backend_name: str) -> Dict[str, Any]:
        """
        Run a full quantum advantage study with AI optimization
        """
        container.logger().info("quantum_study_started", algorithm=algorithm_type, backend=backend_name)
        
        # 1. Get backend info
        backends_res = await ibm_service_instance.get_backends(token)
        backend_info = {}
        if backends_res.get("success"):
            for b in backends_res.get("backends", []):
                if b["id"] == backend_name:
                    backend_info = b
                    break
        
        # 2. AI-Powered Optimization (watsonx.ai)
        optimization = await watsonx_service.optimize_circuit(circuit_data, backend_info)
        
        # 3. Execution on Real Hardware
        shots = 1024
        result = await ibm_service_instance.submit_job(token, backend_name, circuit_data, shots)
        
        if not result.get("success"):
            return result

        # 4. Return results with study context
        return {
            "success": True,
            "algorithm": algorithm_type,
            "backend": backend_name,
            "job_id": result.get("jobId"),
            "optimization": optimization,
            "timestamp": time.time()
        }

    async def generate_quantum_report(self, study_results: Dict[str, Any]) -> Dict[str, Any]:
        """Generate a research report from study results"""
        report_content = await watsonx_service.generate_research_report(study_results)
        return {
            "success": True,
            "report": report_content,
            "format": "markdown"
        }

quantum_platform = QuantumAdvantagePlatform()
