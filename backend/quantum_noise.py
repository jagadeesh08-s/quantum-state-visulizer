# Quantum Noise Simulation for Bloch Verse
# Implements realistic noise models for quantum hardware simulation

from typing import Dict, List, Optional, Any, Tuple, TYPE_CHECKING
from dataclasses import dataclass
from abc import ABC, abstractmethod
import math

if TYPE_CHECKING:
    import numpy as np
else:
    try:
        import numpy as np  # type: ignore
    except ImportError:
        np = None  # type: ignore


@dataclass
class NoiseParameters:
    """Parameters for quantum noise simulation"""
    # T1/T2 decoherence times (in nanoseconds)
    t1: float = 50_000  # Amplitude damping time
    t2: float = 70_000  # Phase damping time

    # Gate errors
    gate_error_1q: float = 0.001  # Single-qubit gate error rate
    gate_error_2q: float = 0.01   # Two-qubit gate error rate

    # Readout errors
    readout_error_0: float = 0.01  # |0⟩ → |1⟩ error probability
    readout_error_1: float = 0.02  # |1⟩ → |0⟩ error probability

    # Thermal properties
    temperature: float = 0.02  # Temperature in Kelvin (typical for dilution refrigerators)

    # Crosstalk
    crosstalk_strength: float = 0.001  # Coupling between neighboring qubits

    # Enabled noise types
    enable_t1_t2: bool = True
    enable_gate_errors: bool = True
    enable_readout_errors: bool = True
    enable_crosstalk: bool = True
    enable_thermal: bool = True


class QuantumNoiseModel(ABC):
    """Abstract base class for quantum noise models"""

    def __init__(self, params: NoiseParameters):
        self.params = params

    @abstractmethod
    def apply_noise(self, state: np.ndarray, time: float, qubit_indices: List[int]) -> np.ndarray:
        """Apply noise to quantum state"""
        pass


class T1T2NoiseModel(QuantumNoiseModel):
    """T1 (amplitude damping) and T2 (phase damping) noise"""

    def apply_noise(self, state: np.ndarray, time: float, qubit_indices: List[int]) -> np.ndarray:
        """Apply T1/T2 decoherence to specified qubits"""
        if not self.params.enable_t1_t2:
            return state

        noisy_state = state.copy()

        for qubit_idx in qubit_indices:
            # T1: Amplitude damping (energy relaxation)
            gamma_1 = 1.0 / self.params.t1 if self.params.t1 > 0 else 0
            p_decay = 1 - np.exp(-gamma_1 * time)

            # T2: Phase damping (dephasing)
            gamma_2 = 1.0 / self.params.t2 if self.params.t2 > 0 else 0
            gamma_phi = (gamma_2 - gamma_1/2) if gamma_2 > gamma_1/2 else 0
            p_dephase = 1 - np.exp(-gamma_phi * time)

            # Apply amplitude damping
            if p_decay > 1e-10:
                noisy_state = self._apply_amplitude_damping(noisy_state, qubit_idx, p_decay)

            # Apply phase damping
            if p_dephase > 1e-10:
                noisy_state = self._apply_phase_damping(noisy_state, qubit_idx, p_dephase)

        return noisy_state

    def _apply_amplitude_damping(self, rho: np.ndarray, qubit: int, p: float) -> np.ndarray:
        """Apply amplitude damping channel"""
        num_qubits = int(np.log2(rho.shape[0]))

        # Kraus operators for amplitude damping
        K0 = np.array([[1, 0], [0, np.sqrt(1-p)]], dtype=complex)
        K1 = np.array([[0, np.sqrt(p)], [0, 0]], dtype=complex)

        # Extend to full system
        I = np.eye(2**(num_qubits-1), dtype=complex)

        if qubit == 0:
            K0_full = np.kron(K0, I)
            K1_full = np.kron(K1, I)
        else:
            # More complex indexing for other qubits
            # This is a simplified implementation
            K0_full = self._extend_operator(K0, qubit, num_qubits)
            K1_full = self._extend_operator(K1, qubit, num_qubits)

        # Apply channel: ρ → Σ_i K_i ρ K_i†
        term0 = K0_full @ rho @ K0_full.conj().T
        term1 = K1_full @ rho @ K1_full.conj().T

        return term0 + term1

    def _apply_phase_damping(self, rho: np.ndarray, qubit: int, p: float) -> np.ndarray:
        """Apply phase damping channel"""
        num_qubits = int(np.log2(rho.shape[0]))

        # Kraus operators for phase damping
        K0 = np.array([[1, 0], [0, np.sqrt(1-p)]], dtype=complex)
        K1 = np.array([[0, 0], [0, np.sqrt(p)]], dtype=complex)

        # Extend to full system (simplified)
        I = np.eye(2**(num_qubits-1), dtype=complex)

        if qubit == 0:
            K0_full = np.kron(K0, I)
            K1_full = np.kron(K1, I)
        else:
            K0_full = self._extend_operator(K0, qubit, num_qubits)
            K1_full = self._extend_operator(K1, qubit, num_qubits)

        term0 = K0_full @ rho @ K0_full.conj().T
        term1 = K1_full @ rho @ K1_full.conj().T

        return term0 + term1

    def _extend_operator(self, op: np.ndarray, target_qubit: int, num_qubits: int) -> np.ndarray:
        """Extend single-qubit operator to full system (simplified implementation)"""
        # This is a basic implementation - a full implementation would need
        # proper tensor product ordering
        dim = 2 ** num_qubits
        extended = np.zeros((dim, dim), dtype=complex)

        # Simplified: assume little-endian ordering and apply to target qubit
        for i in range(dim):
            for j in range(dim):
                # Extract qubit states
                i_bits = [(i >> k) & 1 for k in range(num_qubits)]
                j_bits = [(j >> k) & 1 for k in range(num_qubits)]

                # Apply operator to target qubit
                if i_bits[target_qubit] < 2 and j_bits[target_qubit] < 2:
                    result_i = op[i_bits[target_qubit], j_bits[target_qubit]]

                    # Reconstruct index (simplified)
                    new_i = i
                    new_j = j

                    if result_i != 0:
                        extended[new_i, new_j] += result_i

        return extended


class GateErrorModel(QuantumNoiseModel):
    """Coherent and incoherent gate errors"""

    def apply_noise(self, state: np.ndarray, time: float, qubit_indices: List[int]) -> np.ndarray:
        """Apply gate errors"""
        if not self.params.enable_gate_errors:
            return state

        noisy_state = state.copy()
        num_qubits = len(qubit_indices)

        # Choose error rate based on gate type
        error_rate = self.params.gate_error_2q if num_qubits > 1 else self.params.gate_error_1q

        if error_rate > 1e-10:
            # Apply depolarizing channel as approximation
            noisy_state = self._apply_depolarizing_channel(noisy_state, qubit_indices, error_rate)

        return noisy_state

    def _apply_depolarizing_channel(self, rho: np.ndarray, qubits: List[int], p: float) -> np.ndarray:
        """Apply depolarizing channel to specified qubits"""
        num_qubits = int(np.log2(rho.shape[0]))
        dim = 2**num_qubits
        
        # Identity matrix for the full system
        identity = np.eye(dim, dtype=complex)
        
        # For a single qubit depolarizing channel: rho -> (1-p)rho + p*I/2
        # For multi-qubit, we scale the identity by 2^n where n is the number of targeted qubits
        # but here we apply it to the whole state as an approximation
        return (1 - p) * rho + (p / dim) * identity


class ThermalNoiseModel(QuantumNoiseModel):
    """Thermal noise representing initialization errors"""

    def apply_noise(self, state: np.ndarray, time: float, qubit_indices: List[int]) -> np.ndarray:
        """Apply thermal noise based on temperature"""
        if not self.params.enable_thermal:
            return state

        noisy_state = state.copy()
        
        # Boltzmann constant in meV/K
        k_b = 0.08617
        # Typical energy gap for superconducting qubits in meV (~5GHz)
        delta_e = 0.02
        
        # Excited state population at equilibrium: p1 = 1 / (1 + exp(ΔE/kT))
        beta = delta_e / (k_b * self.params.temperature) if self.params.temperature > 0 else 100
        p1 = 1.0 / (1.0 + np.exp(beta))
        
        for qubit_idx in qubit_indices:
            # Thermal noise is essentially a bias towards the mixed thermal state
            # This is simplified: we mix the state with a thermal state
            thermal_rho_1q = np.array([[1-p1, 0], [0, p1]], dtype=complex)
            
            # Application here is simplified - in reality it's part of T1 relaxation
            # but we use it as an initialization/static noise here
            if p1 > 1e-10:
                noisy_state = self._mix_with_thermal(noisy_state, qubit_idx, p1)
                
        return noisy_state

    def _mix_with_thermal(self, rho: np.ndarray, qubit: int, p: float) -> np.ndarray:
        """Mix state with thermal state for specified qubit"""
        num_qubits = int(np.log2(rho.shape[0]))
        # Scale of identity mixing
        return (1 - p) * rho + (p / rho.shape[0]) * np.eye(rho.shape[0], dtype=complex)


class CrosstalkNoiseModel(QuantumNoiseModel):
    """Noise representing unintended coupling between qubits"""

    def apply_noise(self, state: np.ndarray, time: float, qubit_indices: List[int]) -> np.ndarray:
        """Apply crosstalk noise"""
        if not self.params.enable_crosstalk or len(qubit_indices) < 2:
            return state

        noisy_state = state.copy()
        strength = self.params.crosstalk_strength
        
        # Simplified: apply a small ZZ rotation between all pairs in qubit_indices
        for i, q1 in enumerate(qubit_indices):
            for q2 in qubit_indices[i+1:]:
                # ZZ interaction: exp(-i * strength * time * Z1 * Z2)
                phi = strength * time * 1e-3 # Scale factor
                noisy_state = self._apply_zz_crosstalk(noisy_state, q1, q2, phi)
                
        return noisy_state

    def _apply_zz_crosstalk(self, rho: np.ndarray, q1: int, q2: int, phi: float) -> np.ndarray:
        """Apply ZZ crosstalk rotation"""
        dim = rho.shape[0]
        U_zz = np.zeros((dim, dim), dtype=complex)
        
        for i in range(dim):
            z1 = 1 if (i >> q1) & 1 else -1
            z2 = 1 if (i >> q2) & 1 else -1
            U_zz[i, i] = np.exp(-1j * phi * z1 * z2)
            
        return U_zz @ rho @ U_zz.conj().T


class ReadoutErrorModel:
    """Measurement readout errors"""

    def __init__(self, params: NoiseParameters):
        self.params = params

    def apply_readout_error(self, measurement_result: int) -> int:
        """Apply readout error to measurement result"""
        if not self.params.enable_readout_errors:
            return measurement_result

        # Asymmetric readout errors
        if measurement_result == 0:
            # |0⟩ → |1⟩ with probability readout_error_0
            if np.random.random() < self.params.readout_error_0:
                return 1
        else:
            # |1⟩ → |0⟩ with probability readout_error_1
            if np.random.random() < self.params.readout_error_1:
                return 0

        return measurement_result

    def apply_readout_error_to_probabilities(self, probabilities: List[float]) -> List[float]:
        """Apply readout errors to measurement probability distribution"""
        if not self.params.enable_readout_errors:
            return probabilities

        # Confusion matrix for readout errors
        confusion_matrix = np.array([
            [1 - self.params.readout_error_0, self.params.readout_error_1],
            [self.params.readout_error_0, 1 - self.params.readout_error_1]
        ])

        # Apply to probabilities (simplified for single qubit)
        if len(probabilities) == 2:
            probs_array = np.array(probabilities)
            noisy_probs = confusion_matrix @ probs_array
            return noisy_probs.tolist()

        return probabilities


class QuantumNoiseSimulator:
    """Main noise simulator coordinating all noise models"""

    def __init__(self, params: Optional[NoiseParameters] = None):
        self.params = params or NoiseParameters()
        self.t1t2_model = T1T2NoiseModel(self.params)
        self.gate_error_model = GateErrorModel(self.params)
        self.readout_model = ReadoutErrorModel(self.params)
        self.thermal_model = ThermalNoiseModel(self.params)
        self.crosstalk_model = CrosstalkNoiseModel(self.params)

    def apply_noise_to_circuit(self, circuit_state: np.ndarray,
                             gate_times: Dict[str, float],
                             qubit_indices: List[int]) -> np.ndarray:
        """Apply noise accumulated during circuit execution"""
        noisy_state = circuit_state.copy()

        # Apply thermal noise (initialization/static)
        noisy_state = self.thermal_model.apply_noise(noisy_state, 0, qubit_indices)

        # Apply T1/T2 decoherence (accumulated over circuit time)
        total_time = sum(gate_times.values())
        noisy_state = self.t1t2_model.apply_noise(noisy_state, total_time, qubit_indices)

        # Apply gate errors
        for gate_time in gate_times.values():
            noisy_state = self.gate_error_model.apply_noise(noisy_state, gate_time, qubit_indices)
            
        # Apply crosstalk
        noisy_state = self.crosstalk_model.apply_noise(noisy_state, total_time, qubit_indices)

        return noisy_state

    def apply_measurement_noise(self, measurement_result: int) -> int:
        """Apply readout errors to measurement"""
        return self.readout_model.apply_readout_error(measurement_result)

    def apply_measurement_noise_to_probabilities(self, probabilities: List[float]) -> List[float]:
        """Apply readout errors to probability distribution"""
        return self.readout_model.apply_readout_error_to_probabilities(probabilities)

    def get_noise_summary(self) -> Dict[str, Any]:
        """Get summary of current noise parameters"""
        return {
            "t1_time_ns": self.params.t1,
            "t2_time_ns": self.params.t2,
            "gate_error_1q": self.params.gate_error_1q,
            "gate_error_2q": self.params.gate_error_2q,
            "readout_error_0_to_1": self.params.readout_error_0,
            "readout_error_1_to_0": self.params.readout_error_1,
            "temperature_k": self.params.temperature,
            "enabled_types": {
                "t1_t2_decoherence": self.params.enable_t1_t2,
                "gate_errors": self.params.enable_gate_errors,
                "readout_errors": self.params.enable_readout_errors,
                "crosstalk": self.params.enable_crosstalk,
                "thermal_noise": self.params.enable_thermal
            }
        }


# Default noise configurations for different hardware types
def get_ibm_noise_params() -> NoiseParameters:
    """Typical parameters for IBM quantum computers"""
    return NoiseParameters(
        t1=50_000,  # 50 μs
        t2=70_000,  # 70 μs
        gate_error_1q=0.001,
        gate_error_2q=0.01,
        readout_error_0=0.01,
        readout_error_1=0.02,
        temperature=0.02
    )

def get_ion_trap_noise_params() -> NoiseParameters:
    """Typical parameters for trapped ion systems"""
    return NoiseParameters(
        t1=1_000_000,  # 1 ms (much longer coherence)
        t2=500_000,    # 500 μs
        gate_error_1q=0.0001,  # Better gate fidelity
        gate_error_2q=0.001,
        readout_error_0=0.001,
        readout_error_1=0.001,
        temperature=0.001  # Colder
    )

def get_perfect_noise_params() -> NoiseParameters:
    """No noise - perfect quantum simulation"""
    return NoiseParameters(
        t1=float('inf'),
        t2=float('inf'),
        gate_error_1q=0.0,
        gate_error_2q=0.0,
        readout_error_0=0.0,
        readout_error_1=0.0,
        enable_t1_t2=False,
        enable_gate_errors=False,
        enable_readout_errors=False
    )