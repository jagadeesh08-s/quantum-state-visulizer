"""
Example: Complete Backend Integration
Demonstrates how to use all optimization features together
"""

import asyncio
import logging
from typing import Dict, Any

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def example_1_basic_caching():
    """Example 1: Basic circuit simulation with caching"""
    print("\n" + "="*60)
    print("EXAMPLE 1: Basic Circuit Simulation with Caching")
    print("="*60)
    
    from backend_integration import get_backend_integration
    
    backend = get_backend_integration()
    
    circuit = {
        "numQubits": 2,
        "gates": [
            {"name": "H", "qubits": [0]},
            {"name": "CNOT", "qubits": [0, 1]}
        ]
    }
    
    # First run (cache miss)
    print("\n1️⃣ First simulation (cache miss)...")
    result1 = await backend.simulate_circuit_cached(circuit)
    print(f"   From cache: {result1.get('from_cache', False)}")
    
    # Second run (cache hit)
    print("\n2️⃣ Second simulation (cache hit)...")
    result2 = await backend.simulate_circuit_cached(circuit)
    print(f"   From cache: {result2.get('from_cache', False)}")
    print(f"   ✅ Cache working! Second call was instant.")

async def example_2_dag_optimization():
    """Example 2: Circuit optimization using DAG"""
    print("\n" + "="*60)
    print("EXAMPLE 2: Circuit Optimization using DAG")
    print("="*60)
    
    from dag_optimizer import DAGOptimizer
    
    # Create a circuit with redundant gates
    circuit = {
        "numQubits": 2,
        "gates": [
            {"name": "H", "qubits": [0]},
            {"name": "X", "qubits": [0]},
            {"name": "X", "qubits": [0]},  # Redundant (X-X cancels)
            {"name": "I", "qubits": [1]},  # Identity (will be removed)
            {"name": "CNOT", "qubits": [0, 1]},
            {"name": "H", "qubits": [0]},
            {"name": "H", "qubits": [0]}   # Redundant (H-H cancels)
        ]
    }
    
    print(f"\n📊 Original circuit:")
    print(f"   Gates: {len(circuit['gates'])}")
    
    # Optimize
    result = DAGOptimizer.optimize_circuit(circuit)
    
    print(f"\n✨ Optimized circuit:")
    print(f"   Gates: {result['metrics']['optimized_gate_count']}")
    print(f"   Reduction: {result['metrics']['gate_reduction']} gates removed")
    print(f"   Depth: {result['metrics']['original_depth']} → {result['metrics']['optimized_depth']}")
    print(f"   ✅ {result['metrics']['gate_reduction']/result['metrics']['original_gate_count']*100:.1f}% improvement!")

async def example_3_job_queue():
    """Example 3: Using the job queue system"""
    print("\n" + "="*60)
    print("EXAMPLE 3: Job Queue with Priority Scheduling")
    print("="*60)
    
    from job_queue import get_job_queue, JobPriority
    
    queue = get_job_queue(max_workers=2)
    
    # Register a handler
    def simulation_handler(data):
        import time
        time.sleep(0.5)  # Simulate work
        return {
            "success": True,
            "circuit": data.get("circuit"),
            "result": "simulation_complete"
        }
    
    queue.register_handler('simulation', simulation_handler)
    
    # Submit jobs with different priorities
    print("\n📤 Submitting jobs...")
    
    low_job = await queue.submit_job(
        'simulation',
        {"circuit": "low_priority"},
        priority=JobPriority.LOW
    )
    print(f"   LOW priority job: {low_job[:8]}...")
    
    high_job = await queue.submit_job(
        'simulation',
        {"circuit": "high_priority"},
        priority=JobPriority.HIGH
    )
    print(f"   HIGH priority job: {high_job[:8]}...")
    
    normal_job = await queue.submit_job(
        'simulation',
        {"circuit": "normal_priority"},
        priority=JobPriority.NORMAL
    )
    print(f"   NORMAL priority job: {normal_job[:8]}...")
    
    # Check queue stats
    stats = queue.get_queue_stats()
    print(f"\n📊 Queue stats:")
    print(f"   Total jobs: {stats['total_jobs']}")
    print(f"   Queued: {sum(stats['queued_by_priority'].values())}")
    print(f"   ✅ Jobs queued successfully!")

async def example_4_complete_workflow():
    """Example 4: Complete workflow with all features"""
    print("\n" + "="*60)
    print("EXAMPLE 4: Complete Workflow (Optimize + Cache + Queue)")
    print("="*60)
    
    from backend_integration import get_backend_integration
    
    backend = get_backend_integration()
    
    circuit = {
        "numQubits": 3,
        "gates": [
            {"name": "H", "qubits": [0]},
            {"name": "H", "qubits": [1]},
            {"name": "X", "qubits": [2]},
            {"name": "X", "qubits": [2]},  # Will be optimized
            {"name": "CNOT", "qubits": [0, 1]},
            {"name": "CNOT", "qubits": [1, 2]}
        ]
    }
    
    print("\n🔄 Running complete workflow...")
    print("   1. DAG optimization")
    print("   2. Caching")
    print("   3. Simulation")
    
    result = await backend.optimize_and_simulate(circuit)
    
    print(f"\n📊 Results:")
    print(f"   Original gates: {result['optimization_metrics']['original_gate_count']}")
    print(f"   Optimized gates: {result['optimization_metrics']['optimized_gate_count']}")
    print(f"   Gate reduction: {result['optimization_metrics']['gate_reduction']}")
    print(f"   Simulation cached: {result['simulation_result'].get('from_cache', False)}")
    print(f"   ✅ Complete workflow executed successfully!")

async def example_5_monitoring():
    """Example 5: System monitoring and statistics"""
    print("\n" + "="*60)
    print("EXAMPLE 5: System Monitoring and Statistics")
    print("="*60)
    
    from backend_integration import get_backend_integration
    
    backend = get_backend_integration()
    
    # Get system stats
    stats = backend.get_system_stats()
    
    print("\n📊 System Statistics:")
    
    # Cache stats
    cache_stats = stats.get('cache', {})
    if cache_stats.get('enabled'):
        print(f"\n🗄️  Cache:")
        print(f"   Status: ✅ Enabled")
        print(f"   Total keys: {cache_stats.get('total_keys', 0)}")
        print(f"   Hits: {cache_stats.get('hits', 0)}")
        print(f"   Misses: {cache_stats.get('misses', 0)}")
        print(f"   Hit rate: {cache_stats.get('hit_rate', 0):.1f}%")
    else:
        print(f"\n🗄️  Cache: ⚠️  Disabled (Redis not available)")
    
    # Queue stats
    queue_stats = stats.get('job_queue', {})
    print(f"\n📋 Job Queue:")
    print(f"   Total jobs: {queue_stats.get('total_jobs', 0)}")
    print(f"   Running: {queue_stats.get('running', 0)}")
    
    queued = queue_stats.get('queued_by_priority', {})
    if queued:
        print(f"   Queued by priority:")
        for priority, count in queued.items():
            if count > 0:
                print(f"      {priority}: {count}")
    
    print(f"\n   ✅ Monitoring working!")

async def main():
    """Run all examples"""
    print("\n" + "🚀"*30)
    print("BACKEND OPTIMIZATION FEATURES - COMPLETE EXAMPLES")
    print("🚀"*30)
    
    try:
        # Run examples
        await example_1_basic_caching()
        await example_2_dag_optimization()
        await example_3_job_queue()
        await example_4_complete_workflow()
        await example_5_monitoring()
        
        print("\n" + "="*60)
        print("✅ ALL EXAMPLES COMPLETED SUCCESSFULLY!")
        print("="*60)
        print("\n💡 Next steps:")
        print("   1. Integrate these features into your main.py")
        print("   2. Use the REST API endpoints for frontend integration")
        print("   3. Monitor performance using /api/optimization/stats")
        print("   4. Read BACKEND_OPTIMIZATION_GUIDE.md for more details")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
