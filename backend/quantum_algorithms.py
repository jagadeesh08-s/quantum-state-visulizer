from typing import Dict, Any, List
import numpy as np

class QuantumAlgorithmSuite:
    """
    Standard quantum algorithms for research
    """
    
    @staticmethod
    def get_vqe_circuit(num_qubits: int, ansatz_params: List[float]) -> Dict[str, Any]:
        """Generate a VQE ansatz circuit"""
        gates = []
        # Basic hardware-efficient ansatz
        for i in range(num_qubits):
            gates.append({"name": "RY", "qubits": [i], "parameters": [ansatz_params[i] if i < len(ansatz_params) else 0.0]})
        
        for i in range(num_qubits - 1):
            gates.append({"name": "CNOT", "qubits": [i, i+1]})
            
        return {
            "numQubits": num_qubits,
            "gates": gates
        }

    @staticmethod
    def get_qaoa_circuit(num_qubits: int, gammas: List[float], betas: List[float]) -> Dict[str, Any]:
        """Generate a QAOA circuit for Max-Cut"""
        gates = []
        # Initial superposition
        for i in range(num_qubits):
            gates.append({"name": "H", "qubits": [i]})
            
        # Problem unitary
        for i in range(num_qubits - 1):
            gates.append({"name": "ZZ", "qubits": [i, i+1], "parameters": [gammas[0] if gammas else 0.5]})
            
        # Mixer unitary
        for i in range(num_qubits):
            gates.append({"name": "RX", "qubits": [i], "parameters": [betas[0] if betas else 0.5]})
            
        return {
            "numQubits": num_qubits,
            "gates": gates
        }

quantum_algorithms = QuantumAlgorithmSuite()
