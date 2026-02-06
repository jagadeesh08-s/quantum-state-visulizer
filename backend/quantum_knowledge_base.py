# Comprehensive Quantum Computing Knowledge Base
# Free AI responses for quantum computing questions

import re
import asyncio
import aiohttp
import os
from typing import Dict, List, Any, Optional

QUANTUM_KNOWLEDGE_BASE = [
    # Basic Concepts
    {
        "keywords": ["what is quantum computing", "quantum computer", "quantum vs classical"],
        "response": """Quantum computing harnesses quantum mechanics to perform computations. Unlike classical computers that use bits (0 or 1), quantum computers use quantum bits or qubits that can exist in superposition states.

Key differences:
• **Classical bits**: Can be either 0 OR 1
• **Qubits**: Can be both 0 AND 1 simultaneously (superposition)
• **Parallel processing**: One qubit represents 2 states, two qubits represent 4 states, n qubits represent 2^n states

This exponential advantage enables quantum computers to solve certain problems much faster than classical computers."""
    },

    {
        "keywords": ["qubit", "what is a qubit", "quantum bit"],
        "response": """A qubit (quantum bit) is the fundamental unit of quantum information. Unlike a classical bit that can only be 0 or 1, a qubit can exist in a superposition of both states simultaneously.

**Key properties:**
• **Superposition**: |ψ⟩ = α|0⟩ + β|1⟩ where α and β are complex amplitudes
• **Measurement**: Collapses superposition to either |0⟩ or |1⟩ with probabilities |α|² and |β|²
• **Entanglement**: Qubits can be correlated in ways impossible for classical bits

Physical implementations include superconducting circuits, trapped ions, photons, and quantum dots."""
    },

    {
        "keywords": ["superposition", "what is superposition"],
        "response": """Superposition is a fundamental quantum mechanical principle where a quantum system can exist in multiple states simultaneously. For a qubit, this means it can be in a combination of |0⟩ and |1⟩ states at the same time.

**Mathematical representation:**
|ψ⟩ = α|0⟩ + β|1⟩

Where:
• α and β are complex probability amplitudes
• |α|² + |β|² = 1 (normalization)
• Measurement collapses to |0⟩ with probability |α|², or |1⟩ with probability |β|²

This property enables quantum parallelism - n qubits can represent 2^n states simultaneously."""
    },

    {
        "keywords": ["entanglement", "quantum entanglement", "what is entanglement"],
        "response": """Quantum entanglement is a quantum mechanical phenomenon where two or more particles become correlated such that the quantum state of each particle cannot be described independently. Measuring one particle instantly determines the state of the other, regardless of distance.

**Key aspects:**
• **Non-local correlation**: Changes propagate instantly
• **Bell states**: Maximally entangled two-qubit states
• **Applications**: Quantum teleportation, quantum cryptography, quantum computing

Einstein called it "spooky action at a distance," but it's now experimentally verified and forms the basis for quantum communication protocols."""
    },

    {
        "keywords": ["measurement", "quantum measurement", "collapse"],
        "response": """Quantum measurement is the process of extracting classical information from a quantum system. When measured, a quantum state collapses from superposition to a definite classical state.

**Key principles:**
• **Wave function collapse**: Superposition reduces to single eigenstate
• **Probabilistic outcomes**: Results follow quantum probability rules
• **No-cloning theorem**: Quantum states cannot be perfectly copied
• **Observer effect**: Measurement changes the quantum state

This measurement process is fundamental to quantum computing and quantum information theory."""
    },

    # Quantum Gates
    {
        "keywords": ["quantum gates", "quantum logic gates", "gates"],
        "response": """Quantum gates are unitary operations that manipulate qubits. Unlike classical gates, quantum gates must be reversible and preserve quantum information.

**Common single-qubit gates:**
• **Pauli gates**: X (NOT), Y, Z
• **Hadamard (H)**: Creates superposition
• **Phase gates**: S, T, RZ
• **Rotation gates**: RX, RY, RZ

**Two-qubit gates:**
• **CNOT**: Controlled-NOT, creates entanglement
• **CZ**: Controlled-Z
• **SWAP**: Exchanges qubit states

All quantum gates are represented by unitary matrices and form the building blocks of quantum algorithms."""
    },

    {
        "keywords": ["hadamard gate", "hadamard", "h gate"],
        "response": """The Hadamard gate (H) is a fundamental quantum gate that creates superposition. It transforms the computational basis states |0⟩ and |1⟩ into equal superpositions.

**Matrix representation:**
H = (1/√2) [1  1]
        [1 -1]

**Action:**
H|0⟩ = (1/√2)(|0⟩ + |1⟩)
H|1⟩ = (1/√2)(|0⟩ - |1⟩)

The Hadamard gate is essential for creating quantum parallelism and is used in many quantum algorithms including quantum Fourier transform and Grover's search algorithm."""
    },

    {
        "keywords": ["cnot", "controlled not", "cx gate"],
        "response": """The Controlled-NOT (CNOT) gate is a two-qubit gate that performs a NOT operation on the target qubit if the control qubit is in state |1⟩.

**Truth table:**
Control | Target | Result
   0    |   0    |   00
   0    |   1    |   01
   1    |   0    |   11
   1    |   1    |   10

**Matrix representation:**
CNOT = |00⟩⟨00| + |01⟩⟨01| + |11⟩⟨10| + |10⟩⟨11|

CNOT gates are crucial for creating entanglement and are fundamental to quantum error correction and quantum algorithms."""
    },

    # Quantum Algorithms
    {
        "keywords": ["quantum algorithms", "famous quantum algorithms"],
        "response": """Quantum algorithms exploit quantum mechanical properties to solve problems faster than classical algorithms. Here are some key ones:

**Search Algorithms:**
• **Grover's algorithm**: O(√N) search in unsorted database vs O(N) classically

**Factoring:**
• **Shor's algorithm**: O(log³ N) factoring vs exponential time classically

**Quantum Simulation:**
• **Quantum phase estimation**: Precise eigenvalue estimation
• **Variational Quantum Eigensolver (VQE)**: Molecular energy calculation

**Optimization:**
• **Quantum Approximate Optimization Algorithm (QAOA)**: Combinatorial optimization

These algorithms demonstrate quantum advantage for specific computational problems."""
    },

    {
        "keywords": ["shor algorithm", "shor", "factoring"],
        "response": """Shor's algorithm is a quantum algorithm for factoring large numbers exponentially faster than any known classical algorithm. This breakthrough threatens classical cryptographic systems like RSA.

**Key steps:**
1. **Quantum Fourier Transform**: Efficiently computes discrete Fourier transform
2. **Period finding**: Uses quantum parallelism to find periods of modular exponentiation
3. **Classical post-processing**: Extracts factors from period information

**Complexity**: O((log N)³) vs exponential time classically

Shor's algorithm demonstrates that quantum computers could break current encryption schemes, driving research in post-quantum cryptography."""
    },

    {
        "keywords": ["grover algorithm", "grover", "quantum search"],
        "response": """Grover's algorithm provides quadratic speedup for searching unsorted databases. It finds a marked item in O(√N) operations instead of O(N) classically.

**How it works:**
1. **Superposition**: Put all items in equal superposition
2. **Oracle**: Marks the target item with phase flip
3. **Amplitude amplification**: Iteratively increases target amplitude
4. **Measurement**: Target item measured with high probability

**Applications**: Database search, optimization problems, machine learning

Grover's algorithm shows how quantum computers can provide provable speedups for search problems."""
    },

    # Quantum Hardware
    {
        "keywords": ["quantum hardware", "quantum computers", "implementations"],
        "response": """Several physical systems can implement quantum computers:

**Superconducting circuits** (IBM, Google):
• Josephson junctions create artificial atoms
• Scalable, fast gate operations
• Current leading technology

**Trapped ions** (IonQ, Honeywell):
• Individual atoms held by electromagnetic fields
• Very high fidelity operations
• Long coherence times

**Photonic quantum computers** (Xanadu):
• Uses photons as qubits
• Room temperature operation
• Natural for quantum communication

**Neutral atoms** (Pasqal, ColdQuanta):
• Laser-cooled atoms in optical lattices
• Scalable architectures
• Good for analog quantum simulation

Each approach has different strengths for different quantum computing applications."""
    },

    # Quantum Error Correction
    {
        "keywords": ["quantum error correction", "error correction", "qec"],
        "response": """Quantum error correction (QEC) protects quantum information from decoherence and noise. Unlike classical error correction, QEC must handle both bit-flip and phase-flip errors.

**Key concepts:**
• **Syndrome measurement**: Detects errors without measuring quantum state
• **Redundancy**: Uses multiple physical qubits to encode one logical qubit
• **Threshold theorem**: Error rates below threshold enable arbitrary precision

**Major codes:**
• **Surface code**: Most promising for large-scale quantum computers
• **Shor code**: First quantum error correction code
• **Steane code**: CSS (Calderbank-Shor-Steane) construction

QEC is essential for building large-scale, fault-tolerant quantum computers."""
    },

    # Applications
    {
        "keywords": ["quantum applications", "quantum computing applications", "uses"],
        "response": """Quantum computing has transformative applications across many fields:

**Cryptography & Security:**
• Breaking current encryption (Shor's algorithm)
• Quantum key distribution (BB84 protocol)
• Post-quantum cryptography development

**Drug Discovery & Chemistry:**
• Molecular energy calculations (VQE)
• Protein folding simulation
• Catalyst design

**Optimization:**
• Supply chain optimization
• Financial portfolio optimization
• Traffic flow optimization

**Machine Learning:**
• Quantum machine learning algorithms
• Speeding up classical ML training
• Quantum data analysis

**Materials Science:**
• New material discovery
• Quantum chemistry simulations
• Battery technology development

These applications leverage quantum advantage for previously intractable problems."""
    },

    # Qiskit
    {
        "keywords": ["qiskit", "quantum programming", "quantum software"],
        "response": """Qiskit is IBM's open-source quantum computing framework for Python. It provides tools for quantum circuit construction, simulation, and execution on real quantum hardware.

**Key components:**
• **Circuit construction**: QuantumCircuit class for building circuits
• **Simulation**: Local simulators with noise models
• **Hardware execution**: Run on IBM Quantum systems
• **Algorithm library**: Pre-built quantum algorithms

**Basic usage:**
```python
from qiskit import QuantumCircuit
qc = QuantumCircuit(2, 2)
qc.h(0)  # Hadamard on qubit 0
qc.cx(0, 1)  # CNOT gate
qc.measure_all()  # Measure all qubits
```

Qiskit makes quantum programming accessible and is widely used in quantum research and education."""
    },

    # Default response for unmatched questions
    {
        "keywords": ["default"],
        "response": """That's an interesting question about quantum computing! While I don't have a specific answer for that exact question, here's some general guidance:

**Quantum computing fundamentals:**
• Quantum computers use qubits instead of classical bits
• Qubits can exist in superposition and entanglement
• This enables quantum parallelism and interference effects

**Key quantum algorithms:**
• Shor's algorithm for factoring (threatens current cryptography)
• Grover's algorithm for search (quadratic speedup)
• Quantum simulation for chemistry and materials

**Current state:**
• Quantum computers exist but are noisy and limited in scale
• Research focuses on error correction and algorithm development
• Applications emerging in optimization, chemistry, and cryptography

For more specific questions about quantum gates, algorithms, or applications, feel free to ask!"""
    }
]

def find_best_response(question: str) -> str:
    """Intelligent response matching function"""
    lower_question = question.lower()

    # Find exact keyword matches first
    for entry in QUANTUM_KNOWLEDGE_BASE:
        if any(keyword.lower() in lower_question for keyword in entry["keywords"]):
            return entry["response"]

    # If no exact match, look for partial matches
    for entry in QUANTUM_KNOWLEDGE_BASE:
        match_score = sum(
            len(keyword) for keyword in entry["keywords"]
            if keyword.lower() in lower_question
        )

        if match_score > 0:
            return entry["response"]

    # Return default response if nothing matches
    return next(
        entry["response"] for entry in QUANTUM_KNOWLEDGE_BASE
        if "default" in entry["keywords"]
    )

def generate_contextual_response(question: str, context: Optional[Dict[str, Any]] = None) -> str:
    """Enhanced AI response with context awareness"""
    base_response = find_best_response(question)

    # Add contextual enhancements based on the question type
    if any(word in question.lower() for word in ["how", "why"]):
        return base_response + "\n\n**Want to learn more?** Try building this concept in the Circuit Builder tab above!"

    if any(word in question.lower() for word in ["code", "program"]):
        return base_response + "\n\n**Try it yourself!** Switch to the Code tab to see Qiskit implementations."

    if any(word in question.lower() for word in ["hardware", "computer"]):
        return base_response + "\n\n**Real quantum hardware:** Check the IBM Quantum connection in the header to run on actual quantum computers!"

    return base_response

async def ask_ollama_question(question: str) -> Optional[str]:
    """Ask questions using Ollama (free local AI)"""
    try:
        ollama_url = os.getenv("OLLAMA_URL", "http://localhost:11434")

        async with aiohttp.ClientSession() as session:
            payload = {
                "model": "mistral",  # or any quantum-capable model you have installed
                "prompt": f"You are an expert quantum computing assistant. Answer this question clearly and accurately: {question}",
                "stream": False,
                "options": {
                    "temperature": 0.7,
                    "num_predict": 300
                }
            }

            async with session.post(f"{ollama_url}/api/generate", json=payload, timeout=aiohttp.ClientTimeout(total=15)) as response:
                if response.status == 200:
                    result = await response.json()
                    if result and "response" in result:
                        return result["response"].strip()

        return None
    except Exception:
        # Ollama not available or not responding
        return None

async def ask_ai_question(question: str) -> str:
    """Ask AI questions using Gemini (if available), Ollama, or fallback to knowledge base"""
    try:
        # Avoid circular import
        from gemini_service import gemini_service

        # 1. Try Gemini AI if available
        if gemini_service.is_configured():
            print(f"DEBUG: Using Gemini AI for question: {question[:50]}...")
            return await gemini_service.generate_response(question)

        # 2. Try Ollama if available (completely free, local AI)
        ollama_response = await ask_ollama_question(question)
        if ollama_response:
            print(f"Ollama AI Response for: \"{question[:50]}...\"")
            return ollama_response

        print("Ollama not available, using knowledge base")

        # Fallback to comprehensive quantum knowledge base
        # Simulate API delay for realistic user experience
        await asyncio.sleep(0.8 + 0.6 * __import__("random").random())

        response = generate_contextual_response(question)
        print(f"Quantum Knowledge Base Response for: \"{question[:50]}...\"")
        return response

    except Exception as e:
        print(f"AI question error: {e}")

        # Fallback response if something goes wrong
        return """I apologize, but I encountered an issue processing your question. Here's some general information about quantum computing:

Quantum computing uses quantum mechanics principles like superposition and entanglement to perform certain calculations much faster than classical computers. Key areas include:

• **Quantum algorithms**: Shor's algorithm, Grover's algorithm
• **Quantum hardware**: Superconducting circuits, trapped ions, photonics
• **Applications**: Cryptography, drug discovery, optimization

Feel free to ask about specific quantum computing topics!"""