import numpy as np
from typing import Dict, List, Any
from qiskit import QuantumCircuit
from qiskit.circuit import Parameter

def json_to_quantum_circuit(circuit_json: Dict[str, Any]) -> QuantumCircuit:
    """
    Converts frontend circuit JSON to a Qiskit QuantumCircuit object.
    
    JSON Shape:
    {
        "numQubits": 2,
        "gates": [
            {"name": "h", "qubits": [0], "parameters": []},
            {"name": "cx", "qubits": [0, 1], "parameters": []}
        ]
    }
    """
    num_qubits = circuit_json.get("numQubits", 1)
    gates = circuit_json.get("gates", [])
    
    qc = QuantumCircuit(num_qubits)
    
    # Map frontend gate names to Qiskit methods
    # Using lowercase names as they appear in frontend
    for gate in gates:
        name = gate.get("name", "").lower()
        qubits = gate.get("qubits", [])
        params = gate.get("parameters", [])
        
        try:
            if name == 'h':
                qc.h(qubits[0])
            elif name == 'x':
                qc.x(qubits[0])
            elif name == 'y':
                qc.y(qubits[0])
            elif name == 'z':
                qc.z(qubits[0])
            elif name == 's':
                qc.s(qubits[0])
            elif name == 'sdg':
                qc.sdg(qubits[0])
            elif name == 't':
                qc.t(qubits[0])
            elif name == 'tdg':
                qc.tdg(qubits[0])
            elif name == 'rx':
                angle = params[0] if params else 0
                qc.rx(angle, qubits[0])
            elif name == 'ry':
                angle = params[0] if params else 0
                qc.ry(angle, qubits[0])
            elif name == 'rz':
                angle = params[0] if params else 0
                qc.rz(angle, qubits[0])
            elif name == 'p' or name == 'phase':
                angle = params[0] if params else 0
                qc.p(angle, qubits[0])
            elif name == 'u' or name == 'u3':
                theta = params[0] if len(params) > 0 else 0
                phi = params[1] if len(params) > 1 else 0
                lam = params[2] if len(params) > 2 else 0
                qc.u(theta, phi, lam, qubits[0])
            elif name == 'cx' or name == 'cnot':
                qc.cx(qubits[0], qubits[1])
            elif name == 'cy':
                qc.cy(qubits[0], qubits[1])
            elif name == 'cz':
                qc.cz(qubits[0], qubits[1])
            elif name == 'ch':
                qc.ch(qubits[0], qubits[1])
            elif name == 'cp' or name == 'cphase':
                angle = params[0] if params else 0
                qc.cp(angle, qubits[0], qubits[1])
            elif name == 'swap':
                qc.swap(qubits[0], qubits[1])
            elif name == 'ccx' or name == 'toffoli':
                qc.ccx(qubits[0], qubits[1], qubits[2])
            elif name == 'sx' or name == 'sqrtx':
                qc.sx(qubits[0])
            elif name == 'sxdg':
                qc.sxdg(qubits[0])
            elif name == 'sqrtz':
                qc.s(qubits[0])
            elif name == 'sqrty':
                qc.ry(np.pi/2, qubits[0])
            elif name == 'id' or name == 'identity' or name == 'i':
                qc.id(qubits[0])
            elif name == 'crx':
                angle = params[0] if params else 0
                qc.crx(angle, qubits[0], qubits[1])
            elif name == 'cry':
                angle = params[0] if params else 0
                qc.cry(angle, qubits[0], qubits[1])
            elif name == 'crz':
                angle = params[0] if params else 0
                qc.crz(angle, qubits[0], qubits[1])
            elif name == 'rxx':
                angle = params[0] if params else 0
                qc.rxx(angle, qubits[0], qubits[1])
            elif name == 'ryy':
                angle = params[0] if params else 0
                qc.ryy(angle, qubits[0], qubits[1])
            elif name == 'rzz':
                angle = params[0] if params else 0
                qc.rzz(angle, qubits[0], qubits[1])
            elif name == 'u1':
                qc.u1(params[0], qubits[0])
            elif name == 'u2':
                qc.u2(params[0], params[1], qubits[0])
            elif name == 'measure':
                # Measurements are usually handled by Sampler/Estimator primitives,
                # but we can add them to the circuit if needed for direct execution.
                qc.measure_all()
        except Exception as e:
            print(f"Error adding gate {name} to circuit: {e}")
            continue

    return qc
