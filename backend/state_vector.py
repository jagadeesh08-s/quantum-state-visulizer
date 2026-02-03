from typing import List, Tuple, TYPE_CHECKING

if TYPE_CHECKING:
    import numpy as np
else:
    try:
        import numpy as np  # type: ignore
    except ImportError:
        np = None  # type: ignore

class StateVector:
    """
    Quantum state vector implementation using numpy complex arrays
    """
    def __init__(self, size: int):
        self.amplitudes = np.zeros(size, dtype=np.complex128)

    @staticmethod
    def from_array(amplitudes: np.ndarray) -> 'StateVector':
        sv = StateVector(len(amplitudes))
        sv.amplitudes = amplitudes.copy()
        return sv

    @staticmethod
    def from_real_array(reals: List[float], imags: List[float]) -> 'StateVector':
        if len(reals) != len(imags):
            raise ValueError('Real and imaginary arrays must have the same length')
        amplitudes = np.array(reals, dtype=np.float64) + 1j * np.array(imags, dtype=np.float64)
        return StateVector.from_array(amplitudes)

    @property
    def size(self) -> int:
        return len(self.amplitudes)

    @property
    def num_qubits(self) -> int:
        return int(np.log2(self.size))

    def get(self, index: int) -> complex:
        if index < 0 or index >= self.size:
            raise IndexError(f'Index {index} out of bounds for state vector of size {self.size}')
        return complex(self.amplitudes[index])

    def set(self, index: int, value: complex):
        if index < 0 or index >= self.size:
            raise IndexError(f'Index {index} out of bounds for state vector of size {self.size}')
        self.amplitudes[index] = complex(value)

    def initialize_to_basis(self, n: int):
        """Initialize to computational basis state |n⟩"""
        if n < 0 or n >= self.size:
            raise ValueError(f'Basis state {n} out of range for {self.num_qubits} qubits')
        self.amplitudes.fill(0+0j)
        self.amplitudes[n] = 1+0j

    def initialize_to_superposition(self):
        """Initialize to superposition state"""
        amplitude = 1 / np.sqrt(self.size)
        self.amplitudes.fill(amplitude + 0j)

    def initialize_first_qubit(self, alpha: complex, beta: complex):
        """Initialize to custom state for first qubit"""
        if self.num_qubits < 1:
            return

        # Normalize the state
        norm = np.sqrt(abs(alpha)**2 + abs(beta)**2)
        if norm > 0:
            alpha_val = alpha / norm
            beta_val = beta / norm
        else:
            alpha_val = 1+0j
            beta_val = 0+0j

        if self.num_qubits == 1:
            self.amplitudes[0] = alpha_val
            self.amplitudes[1] = beta_val
        else:
            # For multi-qubit systems, initialize first qubit with custom state
            # and other qubits to |0⟩
            for i in range(self.size):
                first_qubit_state = alpha_val if (i & 1) == 0 else beta_val
                self.amplitudes[i] = first_qubit_state

    def normalize(self):
        """Normalize the state vector"""
        norm = np.linalg.norm(self.amplitudes)
        if norm > 0:
            self.amplitudes /= norm

    def apply_unitary(self, unitary: np.ndarray, target_qubits: List[int]):
        """Apply a unitary matrix to the state vector"""
        if len(target_qubits) == 1:
            self._apply_single_qubit_gate(unitary, target_qubits[0])
        elif len(target_qubits) == 2:
            self._apply_two_qubit_gate(unitary, target_qubits[0], target_qubits[1])
        else:
            raise ValueError('Only 1 and 2-qubit gates are supported')

    def _apply_single_qubit_gate(self, gate: np.ndarray, qubit_index: int):
        """Apply single qubit gate using vectorized operations"""
        if gate.shape != (2, 2):
            raise ValueError('Single qubit gate must be 2x2 matrix')

        # Reshape to isolate the target qubit
        # Dimensions: (higher_bits, target_bit, lower_bits)
        # Shape: (2^(N-1-k), 2, 2^k) where k is qubit_index
        amount_lower = 1 << qubit_index
        amount_higher = self.size >> (qubit_index + 1)
        
        # Reshape to (higher, 2, lower) to expose the target qubit at axis 1
        tensor = self.amplitudes.reshape(amount_higher, 2, amount_lower)
        
        # Perform matrix multiplication along axis 1
        # new_tensor[i, :, j] = gate @ tensor[i, :, j]
        # Using einsum is often cleanest: 'ij,hjk->hik' (h=higher, i=gate_row, j=gate_col/target_qubit, k=lower)
        # Or simplified manual multiplication for 2x2:
        
        # Using views for in-place-like efficiency
        t0 = tensor[:, 0, :].copy() # Copy needed because we overwrite
        t1 = tensor[:, 1, :].copy()
        
        tensor[:, 0, :] = gate[0, 0] * t0 + gate[0, 1] * t1
        tensor[:, 1, :] = gate[1, 0] * t0 + gate[1, 1] * t1
        
        # Reshape back handled automatically since 'tensor' is a view of self.amplitudes 
        # (Wait, reshape returns a view usually, but sophisticated indexing might copy? 
        # .reshape() returns a view. Modifying tensor modifies self.amplitudes)
        
    def _apply_two_qubit_gate(self, gate: np.ndarray, qubit1: int, qubit2: int):
        """Apply two qubit gate using vectorized operations"""
        if gate.shape != (4, 4):
            raise ValueError('Two qubit gate must be 4x4 matrix')

        # Ensure qubit1 > qubit2 for consistent reshaping logic
        # If not, swap them and permute the gate accordingly
        if qubit1 < qubit2:
            # We want to apply to (q1, q2). If q1 < q2 (q1 is less significant bit?), careful with ordering.
            # Our indexing: bit = (i >> k) & 1. So qubit 0 is LSB.
            # If we want standard 'control, target' logic, user usually passes [control, target].
            # But here we just need to isolate two bits.
            pass # The logic below will handle arbitrary indices assuming we calculate reshape dimensions correctly.
            
        # For arbitrary qubits, it's harder to get a single reshaped view because stride is non-contiguous?
        # Actually yes. If qubits are not adjacent, we can't just reshape to (H, 2, M, 2, L).
        # We generally need to permute axes (transposition) to bring them together, apply, then transpose back.
        
        n = self.num_qubits
        
        # Reshape to (2, 2, ..., 2)
        tensor = self.amplitudes.reshape([2] * n)
        
        # Move target qubits to the end (axes n-1-qubit1 and n-1-qubit2)
        # Remember: qubit 0 is last axis in 'C' order reshape of (2,2,...,2) corresponding to ...q2 q1 q0
        axis1 = n - 1 - qubit1
        axis2 = n - 1 - qubit2
        
        # Move axes to front: (q1, q2, others...)
        # We want to operate on them as a block.
        # Tensordot or einsum is best here.
        
        # 'gate' is 4x4, acting on vector of size 4.
        # Or 2x2x2x2 acting on 2x2.
        
        if np:
            # Efficient tensor swap
            # Move target axes to 0, 1
            source_axes = [axis1, axis2]
            dest_axes = [0, 1]
            permuted = np.moveaxis(tensor, source_axes, dest_axes)
            
            # Reshape gate to (2, 2, 2, 2) -> (out1, out2, in1, in2) ??
            # Gate is usually flattened (4, 4) -> corresponding to (q1q2_out, q1q2_in)
            # Let's use tensordot with correct reshaping.
            
            # Helper: Apply gate to the first two axes of permuted tensor
            # permuted shape: (2, 2, rest...)
            # We want (output_q1, output_q2, rest)
            # flattened_permuted: (4, rest_size)
            
            shape_rest = permuted.shape[2:]
            
            # We need to accept both (4,4) gate or reshaped
            gate_tensor = gate.reshape(2, 2, 2, 2)
            
            # new_state = sum(G[i,j, k,l] * state[k,l, ...])
            # tensordot along axes (2,3) of Gate and (0,1) of State
            new_tensor = np.tensordot(gate_tensor, permuted, axes=([2, 3], [0, 1]))
            
            # new_tensor now has shape (2, 2, rest...) where 0,1 are the qubits q1, q2
            # Move axes back to original positions
            final_tensor = np.moveaxis(new_tensor, [0, 1], source_axes)
            
            # Assign back to self.amplitudes
            self.amplitudes[:] = final_tensor.flatten()
            
        else:
            # Fallback for no numpy (unlikely but safe)
            pass

    def measure(self, qubit_index: int) -> Tuple[int, float, 'StateVector']:
        """Measure a qubit in computational basis"""
        # Vectorized probability calculation
        # Sum of |amplitudes|^2 where bit is 0 vs 1
        
        # Use the reshape trick
        amount_lower = 1 << qubit_index
        amount_higher = self.size >> (qubit_index + 1)
        tensor = self.amplitudes.reshape(amount_higher, 2, amount_lower)
        
        probs = np.sum(np.abs(tensor)**2, axis=(0, 2))
        prob0 = probs[0]
        prob1 = probs[1]
        
        if prob0 + prob1 < 1e-10:
             # Handle Numerical instability
             prob0 = 0.5
             prob1 = 0.5
        else:
             prob0 /= (prob0 + prob1)
             prob1 /= (prob0 + prob1)

        outcome = 0 if np.random.random() < prob0 else 1
        probability = prob0 if outcome == 0 else prob1

        # Collapse state
        new_state = StateVector(self.size)
        normalization_factor = 1.0 / np.sqrt(probability) if probability > 0 else 0
        
        # To collapse, zero out the other branch and normalize
        # We can do this in-place-ish or just copy
        
        collapsed_tensor = tensor.copy()
        if outcome == 0:
            collapsed_tensor[:, 1, :] = 0
        else:
            collapsed_tensor[:, 0, :] = 0
            
        new_state.amplitudes = collapsed_tensor.flatten() * normalization_factor
        
        return outcome, probability, new_state

    def get_probabilities(self) -> List[float]:
        """Get probabilities for all computational basis states"""
        return np.abs(self.amplitudes)**2

    def clone(self) -> 'StateVector':
        """Clone the state vector"""
        return StateVector.from_array(self.amplitudes)

    def to_array(self) -> List[Tuple[float, float]]:
        """Convert to array format for external use"""
        # return [(amp.real, amp.imag) for amp in self.amplitudes]
        # Faster version?
        # Usually for JSON serialization we iterate anyway, but let's keep it safe
        return list(zip(self.amplitudes.real, self.amplitudes.imag))

    def get_bloch_vector(self, qubit_index: int) -> Tuple[float, float, float]:
        """Get Bloch vector for a specific qubit"""
        # Linear time O(N) extraction using reduced density matrix element calculation
        # Note: 'N' here is state vector size M=2^n. Just one pass over data.
        
        reduced_dm = self._get_reduced_density_matrix(qubit_index)
        x = 2 * np.real(reduced_dm[0, 1])
        y = 2 * np.imag(reduced_dm[0, 1])
        z = np.real(reduced_dm[0, 0] - reduced_dm[1, 1])

        return x, y, z

    def _get_reduced_density_matrix(self, qubit_index: int) -> np.ndarray:
        """Get reduced density matrix for a qubit using vectorized operations O(2^N)"""
        # Reshape to isolate target qubit
        amount_lower = 1 << qubit_index
        amount_higher = self.size >> (qubit_index + 1)
        
        # Shape: (Higher, Qubit, Lower)
        tensor = self.amplitudes.reshape(amount_higher, 2, amount_lower)
        
        # rho_00 = sum(|c_0|^2)
        # rho_11 = sum(|c_1|^2)
        # rho_01 = sum(c_0 * c_1^*)
        # rho_10 = rho_01^*
        
        # Sum over axes 0 (higher) and 2 (lower)
        
        c0 = tensor[:, 0, :]
        c1 = tensor[:, 1, :]
        
        rho00 = np.sum(np.abs(c0)**2)
        rho11 = np.sum(np.abs(c1)**2)
        rho01 = np.sum(c0 * np.conj(c1))
        
        dm = np.array([
            [rho00, rho01],
            [np.conj(rho01), rho11]
        ], dtype=np.complex128)
        
        return dm

    def get_purity(self, qubit_index: int) -> float:
        """Calculate purity of a qubit"""
        reduced_dm = self._get_reduced_density_matrix(qubit_index)
        # Purity = Tr(rho^2) = sum(|rho_ij|^2)
        return float(np.real(np.sum(np.abs(reduced_dm)**2)))
