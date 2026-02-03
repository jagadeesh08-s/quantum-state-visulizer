import asyncio
from typing import Dict, Any, Optional
from quantum_api_types import BackendType, QuantumExecutionOptions, QuantumExecutionResult
from quantum_executor import execute_circuit_locally
from qiskit_simulator import execute_circuit as execute_qiskit_locally

class QuantumAPI:
    def __init__(self):
        pass

    async def execute_quantum_circuit(self, circuit: Dict[str, Any], options: QuantumExecutionOptions) -> QuantumExecutionResult:
        """
        Execute a quantum circuit on the specified backend
        """
        try:
            circuit_data = {
                "circuit": circuit,
                "initialState": options.initial_state,
                "customState": options.custom_state,
                "shots": options.shots,
                "token": options.token,
                "backend": options.backend_name
            }

            if options.backend == BackendType.LOCAL:
                print(f"DEBUG_BRIDGE: Calling execute_circuit_locally with {list(circuit_data.keys())}", file=sys.stderr)
                result = execute_circuit_locally(circuit_data)
                print(f"DEBUG_BRIDGE: execute_circuit_locally returned {type(result)}", file=sys.stderr)
            elif options.backend == BackendType.AER_SIMULATOR:
                # Use the complex statevector simulator for AER
                res = execute_qiskit_locally(circuit_data)
                result = {
                    "success": res.get("success", False),
                    "method": "qiskit_simulator",
                    "backend": "aer_simulator",
                    "execution_time": res.get("executionTime", 0),
                    "qubit_results": res.get("qubitResults", []),
                    "error": res.get("error")
                }
            else:
                # Fallback to local
                result = execute_circuit_locally(circuit_data)
            import sys
            import os
            log_path = os.path.join(os.path.dirname(__file__), "api_debug.log")
            with open(log_path, "a") as f:
                f.write(f"Result: {result}\n")
            
            print(f"DEBUG_BRIDGE: Result from executor: {result}", file=sys.stderr)

            return QuantumExecutionResult(
                success=result.get("success", False),
                method=result.get("method", "local"),
                backend=result.get("backend", "local"),
                executionTime=result.get("executionTime", 0),
                qubitResults=result.get("qubitResults"),
                error=result.get("error")
            )
        except Exception as e:
            import traceback
            err_msg = f"API BRIDGE ERROR: {str(e)}\n{traceback.format_exc()}"
            print(err_msg, file=sys.stderr)
            try:
                with open("bridge_error.log", "w") as f:
                    f.write(err_msg)
            except:
                pass
            return QuantumExecutionResult(
                success=False,
                method="error",
                backend="unknown",
                executionTime=0,
                error=str(e)
            )

def execute_quantum_circuit_sync(circuit: Dict[str, Any], options: QuantumExecutionOptions) -> QuantumExecutionResult:
    api = QuantumAPI()
    return asyncio.run(api.execute_quantum_circuit(circuit, options))
