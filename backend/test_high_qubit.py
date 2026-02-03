import requests
import json
import time

def test_high_qubit_simulation():
    url = "http://localhost:8000/api/simulate" # Adjusted to match likely port, usually 5000 or 8000 based on prev context, assuming standard
    # Based on prev logs backend running on 8000 or 5000? 
    # main.py usually uses 8000. Let's try 8000.
    
    # Create valid QuantumExecutionRequest payload
    payload = {
        "circuit": {
            "numQubits": 15,
            "gates": [
                {"name": "H", "qubits": [0], "parameters": []},
                {"name": "CX", "qubits": [0, 1], "parameters": []},
                {"name": "CX", "qubits": [1, 2], "parameters": []}
            ]
        },
        "backend": "local",
        "shots": 1,
        "initialState": "ket0",
        "token": None
    }
    
    try:
        print(f"Testing 20-qubit simulation...")
        start = time.time()
        # Correct Endpoint
        response = requests.post("http://127.0.0.1:3005/api/quantum/execute", json=payload, timeout=30)
        duration = time.time() - start
        
        if response.status_code == 200:
            result = response.json()
            if result.get("success"):
                print(f"SUCCESS: Simulation took {duration:.2f}s")
                # ...
            else:
                print(f"FAILED Response: {json.dumps(result, indent=2)}")
        else:
            print(f"HTTP ERROR: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"CONNECTION ERROR: {str(e)}")

# Try standard ports
if __name__ == "__main__":
    test_high_qubit_simulation()
