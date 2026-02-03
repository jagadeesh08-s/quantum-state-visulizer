
import sys
import os
import json
import time
import numpy as np

# ensure we can import from local directory
sys.path.append(os.getcwd())

try:
    print("Testing quantum_simulator directly...")
    from quantum_simulator import execute_circuit
    
    circuit = {
        "numQubits": 15,
        "gates": [
            {"name": "H", "qubits": [0], "parameters": []},
            {"name": "CX", "qubits": [0, 1], "parameters": []},
            {"name": "CX", "qubits": [1, 2], "parameters": []}
        ]
    }
    
    start = time.time()
    result = execute_circuit({
        "circuit": circuit, 
        "shots": 1,
        "initialState": "ket0",
        "backend": "local"
    })
    duration = time.time() - start
    
    print(f"Execution took {duration:.4f}s")
    print(f"Success: {result.get('success')}")
    if not result.get('success'):
        print(f"Error: {result.get('error')}")
    else:
        print("Qubit results found:", len(result.get('qubitResults', [])))
        
except Exception as e:
    print(f"CRITICAL EXCEPTION: {e}")
    import traceback
    traceback.print_exc()
