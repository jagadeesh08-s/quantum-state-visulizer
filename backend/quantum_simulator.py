import time
from typing import List, Dict, Any, Tuple, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    import numpy as np
else:
    try:
        import numpy as np  # type: ignore
    except ImportError:
        np = None  # type: ignore

from state_vector import StateVector
from gates import QuantumGates
from quantum_noise import QuantumNoiseSimulator, NoiseParameters, get_ibm_noise_params, get_ion_trap_noise_params, get_perfect_noise_params

class QuantumSimulator:
    """
    High-performance quantum circuit simulator with noise modeling
    """
    def __init__(self, num_qubits: int, noise_params: Optional[NoiseParameters] = None):
        self.num_qubits = num_qubits
        self.state_vector = StateVector(1 << num_qubits)
        self.noise_simulator = QuantumNoiseSimulator(noise_params) if noise_params else None
        self.gate_times = {}  # Track execution time for noise modeling
        self.total_execution_time = 0.0

    def initialize_state(self, initial_state: str, custom_state: Optional[Dict[str, complex]] = None):
        """Initialize the quantum state"""
        if initial_state == 'ket0':
            self.state_vector.initialize_to_basis(0)
        elif initial_state == 'ket1':
            self.state_vector.initialize_to_basis(1)
        elif initial_state == 'ket2':  # |+⟩
            self.state_vector.initialize_to_basis(0)
            self.apply_gate('H', [0])
        elif initial_state == 'ket3':  # |-⟩
            self.state_vector.initialize_to_basis(0)
            self.apply_gate('X', [0])
            self.apply_gate('H', [0])
        elif initial_state == 'ket4':  # |+i⟩
            self.state_vector.initialize_to_basis(0)
            self.apply_gate('H', [0])
            self.apply_gate('S', [0])
        elif initial_state == 'ket5':  # |-i⟩
            self.state_vector.initialize_to_basis(0)
            self.apply_gate('X', [0])
            self.apply_gate('H', [0])
            self.apply_gate('S', [0])
        elif initial_state == 'ket6':  # Custom state
            if custom_state:
                alpha = custom_state.get('alpha', 1+0j)
                beta = custom_state.get('beta', 0+0j)
                self.state_vector.initialize_first_qubit(alpha, beta)
            else:
                self.state_vector.initialize_to_basis(0)
        else:
            self.state_vector.initialize_to_basis(0)

    def apply_gate(self, gate_name: str, qubits: List[int], parameters: List[float] = None):
        """Apply a quantum gate to the circuit with noise simulation"""
        if parameters is None:
            parameters = []

        try:
            # Get gate execution time (simplified model)
            gate_time = self._get_gate_execution_time(gate_name, len(qubits))
            self.total_execution_time += gate_time

            # Apply the ideal gate
            gate = QuantumGates.get_gate(gate_name, parameters)
            self.state_vector.apply_unitary(gate, qubits)

            # Apply noise if enabled and simulator exists
            if self.noise_simulator and (self.noise_simulator.params.enable_gate_errors or self.noise_simulator.params.enable_t1_t2):
                # Convert state vector to density matrix for noise application
                density_matrix = self._state_vector_to_density_matrix()

                # Apply noise
                noisy_density_matrix = self.noise_simulator.apply_noise_to_circuit(
                    density_matrix, {'gate': gate_time}, qubits
                )

                # Convert back to state vector (simplified - assumes pure state)
                self._density_matrix_to_state_vector(noisy_density_matrix)

        except Exception as e:
            raise ValueError(f'Failed to apply gate {gate_name}: {str(e)}')

    def apply_gates(self, gates: List[Dict[str, Any]]):
        """Apply multiple gates in sequence"""
        for gate in gates:
            self.apply_gate(gate['name'], gate['qubits'], gate.get('parameters', []))

    def _get_gate_execution_time(self, gate_name: str, num_qubits: int) -> float:
        """Get estimated execution time for a gate (in nanoseconds)"""
        # Simplified timing model - in reality this would be hardware-specific
        base_times = {
            'I': 10, 'X': 25, 'Y': 25, 'Z': 15, 'H': 20, 'S': 15, 'T': 15,
            'RX': 30, 'RY': 30, 'RZ': 20, 'P': 20,
            'CNOT': 100, 'CZ': 90, 'SWAP': 120, 'CCNOT': 200, 'FREDKIN': 250,
            'CRX': 120, 'CRY': 120, 'CRZ': 100
        }

        return base_times.get(gate_name.upper(), 50)  # Default 50ns

    def _state_vector_to_density_matrix(self) -> np.ndarray:
        """Convert state vector to density matrix"""
        if self.num_qubits > 14:
            raise MemoryError(f"Density matrix computation disabled for {self.num_qubits} qubits (too large).")
        
        state_vector = self.state_vector.to_array()
        # Convert from [(real, imag), ...] format to complex array
        sv_complex = np.array([complex(r, i) for r, i in state_vector])
        return np.outer(sv_complex, sv_complex.conj())

    def _density_matrix_to_state_vector(self, density_matrix: np.ndarray):
        """Convert pure density matrix back to state vector (simplified)"""
        # This is a simplification - assumes pure state
        # In a full implementation, we'd need to handle mixed states
        eigenvalues, eigenvectors = np.linalg.eigh(density_matrix)
        max_idx = np.argmax(eigenvalues)
        state_vector = eigenvectors[:, max_idx]

        # Normalize
        state_vector = state_vector / np.linalg.norm(state_vector)

        # Convert back to our format
        for i, amp in enumerate(state_vector):
            self.state_vector.set(i, complex(amp))

    def measure(self, qubit_index: int) -> Tuple[int, float]:
        """Measure a specific qubit with readout noise"""
        outcome, probability, new_state = self.state_vector.measure(qubit_index)

        # Apply readout noise if enabled and simulator exists
        if self.noise_simulator:
            noisy_outcome = self.noise_simulator.apply_measurement_noise(outcome)
        else:
            noisy_outcome = outcome

        self.state_vector = new_state  # Update to collapsed state
        return noisy_outcome, probability

    def get_measurement_probabilities(self) -> List[float]:
        """Get measurement probabilities for all qubits"""
        return self.state_vector.get_probabilities()

    def get_bloch_vector(self, qubit_index: int) -> Tuple[float, float, float]:
        """Get Bloch vector for a specific qubit"""
        return self.state_vector.get_bloch_vector(qubit_index)

    def get_purity(self, qubit_index: int) -> float:
        """Get purity of a qubit"""
        return self.state_vector.get_purity(qubit_index)

    def get_concurrence(self) -> float:
        """Calculate concurrence for 2-qubit entanglement"""
        if self.num_qubits != 2:
            return 0.0

        # For 2-qubit systems, calculate concurrence
        rho = self._compute_density_matrix()

        # Calculate concurrence using simplified formula
        off_diag = abs(rho[0, 3]) + abs(rho[1, 2]) + abs(rho[2, 1]) + abs(rho[3, 0])
        diag = abs(rho[0, 0]) + abs(rho[1, 1]) + abs(rho[2, 2]) + abs(rho[3, 3])

        concurrence = max(0, 2 * off_diag - diag)
        return min(concurrence, 1.0)

    def get_von_neumann_entropy(self) -> float:
        """Calculate von Neumann entropy"""
        rho = self._compute_density_matrix()
        eigenvalues = self._get_matrix_eigenvalues(rho)

        entropy = 0.0
        for eigenval in eigenvalues:
            real_val = np.real(eigenval)
            if real_val > 1e-10:
                entropy -= real_val * np.log2(real_val)

        return entropy

    def get_state_vector(self) -> List[Tuple[float, float]]:
        """Get the full state vector"""
        return self.state_vector.to_array()

    def clone(self) -> 'QuantumSimulator':
        """Clone the simulator"""
        cloned = QuantumSimulator(self.num_qubits)
        cloned.state_vector = self.state_vector.clone()
        return cloned

    def reset(self):
        """Reset to |0...0⟩ state"""
        self.state_vector = StateVector(1 << self.num_qubits)
        self.state_vector.initialize_to_basis(0)

    def _compute_density_matrix(self) -> np.ndarray:
        """Compute density matrix from state vector"""
        if self.num_qubits > 14:
            raise MemoryError(f"Density matrix computation disabled for {self.num_qubits} qubits (too large).")
        
        size = self.state_vector.size
        rho = np.zeros((size, size), dtype=np.complex128)

        # Convert state vector to complex array
        sv_array = self.state_vector.to_array()
        sv_complex = np.array([complex(r, i) for r, i in sv_array])
        
        return np.outer(sv_complex, sv_complex.conj())

    def get_qubit_density_matrix(self, qubit_index: int) -> List[List[str]]:
        """Get formatted reduced density matrix for a specific qubit"""
        # Use the optimized O(N) method from StateVector instead of computing full density matrix
        # This avoids the O(4^N) memory explosion
        rho = self.state_vector._get_reduced_density_matrix(qubit_index)
        
        # Format for frontend
        formatted = []
        for row in rho:
            formatted_row = []
            for val in row:
                sign = "+" if val.imag >= 0 else "-"
                formatted_row.append(f"{val.real:.4f} {sign} {abs(val.imag):.4f}j")
            formatted.append(formatted_row)
            
        return formatted


    def _get_matrix_eigenvalues(self, matrix: np.ndarray) -> np.ndarray:
        """Get eigenvalues of a matrix"""
        return np.linalg.eigvals(matrix)


def execute_circuit(circuit_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Execute a complete quantum circuit with optional noise simulation
    """
    start_time = time.time()

    try:
        circuit = circuit_data['circuit']
        num_qubits = circuit['numQubits']
        
        # Memory Safeguard for High Qubit Counts
        if num_qubits >= 20:
             # Basic check: 20 qubits = 2^20 complex doubles * 16 bytes ~= 16MB statevector (safe)
             # 25 qubits = 32MB * 16 = 512MB (safe)
             # 28 qubits = 4GB (borderline for some systems)
             # 30 qubits = 16GB (requires high-end machine)
             
             try:
                 import psutil
                 mem = psutil.virtual_memory()
                 required_bytes = (2**num_qubits) * 16 # Complex128 = 16 bytes
                 if mem.available < required_bytes + 1024*1024*512: # Buffer 512MB
                     return {
                         'success': False, 
                         'error': f"Insufficient memory for {num_qubits} qubits. Required: {required_bytes/1024**3:.2f}GB, Available: {mem.available/1024**3:.2f}GB"
                     }
             except ImportError:
                 pass # Cannot check, proceed with caution

        initial_state = circuit_data['initialState']
        custom_state = circuit_data.get('customState')

        # Get noise configuration
        noise_config = circuit_data.get('noise', {})
        noise_params = None

        # Auto-disable noise for high qubit counts to prevent O(N^2) density matrix overhead
        # Noise simulation typically requires density matrices or many shots
        if num_qubits > 14 and noise_config.get('enabled', False):
            print(f"Warning: Disabling noise simulation for {num_qubits} qubits to preserve memory.")
            noise_config['enabled'] = False

        if noise_config.get('enabled', False):
            noise_type = noise_config.get('type', 'ibm')
            if noise_type == 'ibm':
                noise_params = get_ibm_noise_params()
            elif noise_type == 'ion_trap':
                noise_params = get_ion_trap_noise_params()
            elif noise_type == 'custom':
                # Allow custom noise parameters
                noise_params = NoiseParameters(
                    t1=noise_config.get('t1', 50000),
                    t2=noise_config.get('t2', 70000),
                    gate_error_1q=noise_config.get('gateError1q', 0.001),
                    gate_error_2q=noise_config.get('gateError2q', 0.01),
                    readout_error_0=noise_config.get('readoutError0', 0.01),
                    readout_error_1=noise_config.get('readoutError1', 0.02),
                    temperature=noise_config.get('temperature', 0.02),
                    crosstalk_strength=noise_config.get('crosstalk', 0.001),
                    enable_t1_t2=noise_config.get('enableT1T2', True),
                    enable_gate_errors=noise_config.get('enableGateErrors', True),
                    enable_readout_errors=noise_config.get('enableReadoutErrors', True),
                    enable_crosstalk=noise_config.get('enableCrosstalk', True),
                    enable_thermal=noise_config.get('enableThermal', True)
                )
            # If noise_type is 'perfect' or not recognized, noise_params stays None (no noise)

        simulator = QuantumSimulator(circuit['numQubits'], noise_params)

        # Initialize state
        custom_complex_state = None
        if custom_state:
            custom_complex_state = {
                'alpha': complex(float(custom_state.get('alpha', 1)), 0),
                'beta': complex(float(custom_state.get('beta', 0)), 0)
            }

        simulator.initialize_state(initial_state, custom_complex_state)

        # Apply gates
        simulator.apply_gates(circuit['gates'])

        # Calculate entanglement measures (SKIP for high qubits)
        if num_qubits <= 14:
            concurrence = simulator.get_concurrence()
            von_neumann_entropy = simulator.get_von_neumann_entropy()
            is_entangled = concurrence > 0.1
            witness_value = concurrence - 0.5
        else:
            concurrence = 0.0
            von_neumann_entropy = 0.0
            is_entangled = False
            witness_value = 0.0

        # Calculate results for each qubit
        qubit_results = []
        for i in range(circuit['numQubits']):
            # For 30 qubits, we ONLY want Bloch vectors. Statevector is too big to send.
            # Even Bloch vectors might be slow to loop 30 times if not optimized, but O(N) per qubit is fine.
            
            bloch_vector = simulator.get_bloch_vector(i)
            purity = simulator.get_purity(i)
            bloch_radius = np.sqrt(bloch_vector[0]**2 + bloch_vector[1]**2 + bloch_vector[2]**2)
            reduced_radius = min(bloch_radius, 1.0)
            
            result_entry = {
                'qubitIndex': i,
                'blochVector': {'x': bloch_vector[0], 'y': bloch_vector[1], 'z': bloch_vector[2]},
                'purity': purity,
                'reducedRadius': reduced_radius,
                'isEntangled': is_entangled, # Global property approx
                'concurrence': concurrence,
                'vonNeumannEntropy': von_neumann_entropy,
                'witnessValue': witness_value,
                'densityMatrix': simulator.get_qubit_density_matrix(i),
                'statevector': None # Never send full statevector for visualizer here, too big
            }
            
            # Only attach full statevector for qubit 0 if small enough
            if i == 0 and num_qubits <= 12:
                result_entry['statevector'] = simulator.get_state_vector()
                
            qubit_results.append(result_entry)

        execution_time = time.time() - start_time

        # Include noise information in response
        noise_info = None
        if simulator.noise_simulator:
            noise_info = simulator.noise_simulator.get_noise_summary()

        return {
            'success': True,
            'qubitResults': qubit_results,
            'executionTime': execution_time,
            'noise': noise_info,
            'totalCircuitTime': simulator.total_execution_time,
            'approximate': num_qubits > 14 # Flag to frontend that some metrics are skipped
        }

    except Exception as e:
        return {
            'success': False,
            'qubitResults': [],
            'executionTime': time.time() - start_time,
            'error': str(e)
        }