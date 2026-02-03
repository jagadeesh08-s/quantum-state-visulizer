"""
Circuit DAG Optimizer
Optimizes quantum circuits using DAG (Directed Acyclic Graph) analysis
"""

from typing import List, Dict, Any, Tuple, Set
from dataclasses import dataclass
from collections import defaultdict
import logging

logger = logging.getLogger(__name__)

@dataclass
class GateNode:
    """Represents a gate in the circuit DAG"""
    id: int
    name: str
    qubits: List[int]
    parameters: Dict[str, Any]
    dependencies: Set[int]  # IDs of gates that must execute before this one
    level: int = 0  # Depth level in the circuit

class CircuitDAG:
    """Directed Acyclic Graph representation of a quantum circuit"""
    
    def __init__(self, num_qubits: int):
        self.num_qubits = num_qubits
        self.nodes: List[GateNode] = []
        self.qubit_last_gate: Dict[int, int] = {}  # Last gate ID for each qubit
        
    def add_gate(self, name: str, qubits: List[int], parameters: Dict[str, Any] = None) -> int:
        """Add a gate to the DAG"""
        gate_id = len(self.nodes)
        dependencies = set()
        
        # Find dependencies (gates on same qubits that must execute first)
        for qubit in qubits:
            if qubit in self.qubit_last_gate:
                dependencies.add(self.qubit_last_gate[qubit])
        
        # Calculate level (depth)
        level = 0
        if dependencies:
            level = max(self.nodes[dep_id].level for dep_id in dependencies) + 1
        
        node = GateNode(
            id=gate_id,
            name=name,
            qubits=qubits,
            parameters=parameters or {},
            dependencies=dependencies,
            level=level
        )
        
        self.nodes.append(node)
        
        # Update last gate for affected qubits
        for qubit in qubits:
            self.qubit_last_gate[qubit] = gate_id
        
        return gate_id
    
    def get_depth(self) -> int:
        """Get circuit depth"""
        return max((node.level for node in self.nodes), default=0) + 1
    
    def get_gate_count(self) -> int:
        """Get total number of gates"""
        return len(self.nodes)
    
    def get_two_qubit_gate_count(self) -> int:
        """Get number of two-qubit gates"""
        return sum(1 for node in self.nodes if len(node.qubits) == 2)

class DAGOptimizer:
    """Optimizes quantum circuits using DAG analysis"""
    
    @staticmethod
    def build_dag(circuit_data: Dict[str, Any]) -> CircuitDAG:
        """Build DAG from circuit data"""
        num_qubits = circuit_data.get('numQubits', 2)
        gates = circuit_data.get('gates', [])
        
        dag = CircuitDAG(num_qubits)
        
        for gate in gates:
            dag.add_gate(
                name=gate.get('name', 'X'),
                qubits=gate.get('qubits', [0]),
                parameters=gate.get('parameters', {})
            )
        
        return dag
    
    @staticmethod
    def optimize_circuit(circuit_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Optimize circuit using DAG analysis
        Returns optimized circuit and optimization metrics
        """
        try:
            # Build DAG
            dag = DAGOptimizer.build_dag(circuit_data)
            original_depth = dag.get_depth()
            original_gates = dag.get_gate_count()
            original_two_qubit = dag.get_two_qubit_gate_count()
            
            # Apply optimizations
            optimized_gates = DAGOptimizer._apply_optimizations(dag)
            
            # Build optimized DAG
            optimized_circuit = {
                **circuit_data,
                'gates': optimized_gates
            }
            optimized_dag = DAGOptimizer.build_dag(optimized_circuit)
            
            optimization_metrics = {
                "original_depth": original_depth,
                "optimized_depth": optimized_dag.get_depth(),
                "original_gate_count": original_gates,
                "optimized_gate_count": optimized_dag.get_gate_count(),
                "original_two_qubit_gates": original_two_qubit,
                "optimized_two_qubit_gates": optimized_dag.get_two_qubit_gate_count(),
                "depth_reduction": original_depth - optimized_dag.get_depth(),
                "gate_reduction": original_gates - optimized_dag.get_gate_count()
            }
            
            logger.info(f"Circuit optimized: {optimization_metrics}")
            
            return {
                "circuit": optimized_circuit,
                "metrics": optimization_metrics,
                "dag_info": {
                    "num_qubits": dag.num_qubits,
                    "parallelizable_gates": DAGOptimizer._count_parallelizable_gates(optimized_dag)
                }
            }
            
        except Exception as e:
            logger.error(f"DAG optimization failed: {e}")
            return {
                "circuit": circuit_data,
                "metrics": {"error": str(e)},
                "dag_info": {}
            }
    
    @staticmethod
    def _apply_optimizations(dag: CircuitDAG) -> List[Dict[str, Any]]:
        """Apply optimization passes to the DAG"""
        optimized_gates = []
        
        # Pass 1: Remove identity gates
        for node in dag.nodes:
            if node.name == 'I':
                continue  # Skip identity gates
            optimized_gates.append({
                "name": node.name,
                "qubits": node.qubits,
                "parameters": node.parameters
            })
        
        # Pass 2: Merge consecutive single-qubit gates on same qubit
        optimized_gates = DAGOptimizer._merge_single_qubit_gates(optimized_gates)
        
        # Pass 3: Cancel inverse gates (e.g., X followed by X)
        optimized_gates = DAGOptimizer._cancel_inverse_gates(optimized_gates)
        
        return optimized_gates
    
    @staticmethod
    def _merge_single_qubit_gates(gates: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Merge consecutive rotation gates on the same qubit"""
        if len(gates) < 2:
            return gates
        
        merged = []
        i = 0
        
        while i < len(gates):
            current = gates[i]
            
            # Check if we can merge with next gate
            if i + 1 < len(gates):
                next_gate = gates[i + 1]
                
                # Merge RZ gates on same qubit
                if (current['name'] == 'RZ' and next_gate['name'] == 'RZ' and 
                    len(current['qubits']) == 1 and current['qubits'] == next_gate['qubits']):
                    
                    angle1 = current.get('parameters', {}).get('angle', 0)
                    angle2 = next_gate.get('parameters', {}).get('angle', 0)
                    
                    merged.append({
                        "name": "RZ",
                        "qubits": current['qubits'],
                        "parameters": {"angle": angle1 + angle2}
                    })
                    i += 2
                    continue
            
            merged.append(current)
            i += 1
        
        return merged
    
    @staticmethod
    def _cancel_inverse_gates(gates: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Cancel inverse gate pairs (e.g., X-X, H-H)"""
        if len(gates) < 2:
            return gates
        
        # Gates that are their own inverse
        self_inverse = {'X', 'Y', 'Z', 'H', 'CNOT', 'SWAP'}
        
        optimized = []
        i = 0
        
        while i < len(gates):
            current = gates[i]
            
            # Check if next gate cancels this one
            if i + 1 < len(gates):
                next_gate = gates[i + 1]
                
                if (current['name'] == next_gate['name'] and 
                    current['name'] in self_inverse and
                    current['qubits'] == next_gate['qubits']):
                    # Skip both gates (they cancel)
                    i += 2
                    continue
            
            optimized.append(current)
            i += 1
        
        return optimized
    
    @staticmethod
    def _count_parallelizable_gates(dag: CircuitDAG) -> int:
        """Count gates that can be executed in parallel"""
        level_counts = defaultdict(int)
        for node in dag.nodes:
            level_counts[node.level] += 1
        
        # Count levels with multiple gates (parallelizable)
        return sum(1 for count in level_counts.values() if count > 1)
    
    @staticmethod
    def get_critical_path(dag: CircuitDAG) -> List[int]:
        """Get the critical path (longest path) through the DAG"""
        if not dag.nodes:
            return []
        
        # Find node with maximum level
        max_level_node = max(dag.nodes, key=lambda n: n.level)
        
        # Backtrack to find critical path
        path = [max_level_node.id]
        current = max_level_node
        
        while current.dependencies:
            # Find dependency with highest level
            dep_id = max(current.dependencies, 
                        key=lambda d: dag.nodes[d].level)
            path.append(dep_id)
            current = dag.nodes[dep_id]
        
        return list(reversed(path))
