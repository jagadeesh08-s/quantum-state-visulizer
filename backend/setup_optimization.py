"""
Quick Setup Script for Backend Optimization Features
Verifies installation and configuration
"""

import sys
import os

def check_redis():
    """Check if Redis is installed and running"""
    print("\n🔍 Checking Redis...")
    try:
        import redis
        print("✅ Redis package installed")
        
        # Try to connect
        host = os.getenv('REDIS_HOST', 'localhost')
        port = int(os.getenv('REDIS_PORT', '6379'))
        
        client = redis.Redis(host=host, port=port, socket_connect_timeout=2)
        client.ping()
        print(f"✅ Redis server running at {host}:{port}")
        
        # Get info
        info = client.info('server')
        print(f"   Redis version: {info.get('redis_version', 'unknown')}")
        
        return True
    except ImportError:
        print("❌ Redis package not installed")
        print("   Run: pip install redis")
        return False
    except Exception as e:
        print(f"⚠️  Redis server not accessible: {e}")
        print("   Make sure Redis server is running:")
        print("   - Windows: redis-server.exe")
        print("   - Linux/Mac: sudo systemctl start redis")
        return False

def check_dependencies():
    """Check if all required packages are installed"""
    print("\n🔍 Checking dependencies...")
    
    required = [
        'fastapi',
        'uvicorn',
        'redis',
        'qiskit',
        'numpy',
        'pandas'
    ]
    
    missing = []
    for package in required:
        try:
            __import__(package)
            print(f"✅ {package}")
        except ImportError:
            print(f"❌ {package}")
            missing.append(package)
    
    if missing:
        print(f"\n⚠️  Missing packages: {', '.join(missing)}")
        print("   Run: pip install -r requirements.txt")
        return False
    
    return True

def check_files():
    """Check if all new files are present"""
    print("\n🔍 Checking new files...")
    
    files = [
        'redis_cache.py',
        'dag_optimizer.py',
        'job_queue.py',
        'backend_integration.py',
        'routers/optimization.py',
        'BACKEND_OPTIMIZATION_GUIDE.md'
    ]
    
    all_present = True
    for file in files:
        path = os.path.join(os.path.dirname(__file__), file)
        if os.path.exists(path):
            print(f"✅ {file}")
        else:
            print(f"❌ {file} (missing)")
            all_present = False
    
    return all_present

def test_imports():
    """Test importing new modules"""
    print("\n🔍 Testing module imports...")
    
    try:
        from redis_cache import get_cache
        print("✅ redis_cache")
        
        from dag_optimizer import DAGOptimizer
        print("✅ dag_optimizer")
        
        from job_queue import get_job_queue
        print("✅ job_queue")
        
        from backend_integration import get_backend_integration
        print("✅ backend_integration")
        
        return True
    except Exception as e:
        print(f"❌ Import failed: {e}")
        return False

def test_cache():
    """Test Redis cache functionality"""
    print("\n🔍 Testing cache functionality...")
    
    try:
        from redis_cache import get_cache
        cache = get_cache()
        
        if not cache.enabled:
            print("⚠️  Cache disabled (Redis not available)")
            return False
        
        # Test set/get
        test_data = {"test": "data"}
        cache.set_circuit_result({"circuit": "test"}, test_data, ttl=60)
        result = cache.get_circuit_result({"circuit": "test"})
        
        if result == test_data:
            print("✅ Cache read/write working")
        else:
            print("❌ Cache read/write failed")
            return False
        
        # Get stats
        stats = cache.get_stats()
        print(f"   Cache stats: {stats}")
        
        return True
    except Exception as e:
        print(f"❌ Cache test failed: {e}")
        return False

def test_dag_optimizer():
    """Test DAG optimizer"""
    print("\n🔍 Testing DAG optimizer...")
    
    try:
        from dag_optimizer import DAGOptimizer
        
        circuit = {
            "numQubits": 2,
            "gates": [
                {"name": "H", "qubits": [0]},
                {"name": "X", "qubits": [0]},
                {"name": "X", "qubits": [0]},  # Should be optimized away
                {"name": "CNOT", "qubits": [0, 1]}
            ]
        }
        
        result = DAGOptimizer.optimize_circuit(circuit)
        
        if result['metrics']['gate_reduction'] > 0:
            print(f"✅ DAG optimizer working")
            print(f"   Reduced {result['metrics']['gate_reduction']} gates")
        else:
            print("⚠️  DAG optimizer working but no optimization applied")
        
        return True
    except Exception as e:
        print(f"❌ DAG optimizer test failed: {e}")
        return False

def test_job_queue():
    """Test job queue"""
    print("\n🔍 Testing job queue...")
    
    try:
        from job_queue import get_job_queue
        
        queue = get_job_queue(max_workers=2)
        
        # Register test handler
        def test_handler(data):
            return {"result": "success", "input": data}
        
        queue.register_handler('test', test_handler)
        
        stats = queue.get_queue_stats()
        print(f"✅ Job queue initialized")
        print(f"   Stats: {stats}")
        
        return True
    except Exception as e:
        print(f"❌ Job queue test failed: {e}")
        return False

def print_summary(results):
    """Print summary of checks"""
    print("\n" + "="*50)
    print("📊 SETUP SUMMARY")
    print("="*50)
    
    all_passed = all(results.values())
    
    for check, passed in results.items():
        status = "✅" if passed else "❌"
        print(f"{status} {check}")
    
    print("="*50)
    
    if all_passed:
        print("\n🎉 All checks passed! Backend optimization features are ready to use.")
        print("\n📚 Next steps:")
        print("   1. Read BACKEND_OPTIMIZATION_GUIDE.md for usage instructions")
        print("   2. Add router to main.py: app.include_router(optimization_router)")
        print("   3. Initialize on startup: await get_backend_integration().start()")
    else:
        print("\n⚠️  Some checks failed. Please fix the issues above.")
        print("\n💡 Common fixes:")
        print("   - Install Redis: choco install redis-64 (Windows)")
        print("   - Install dependencies: pip install -r requirements.txt")
        print("   - Start Redis: redis-server")

def main():
    """Run all checks"""
    print("🚀 Backend Optimization Setup Checker")
    print("="*50)
    
    results = {
        "Dependencies": check_dependencies(),
        "Files": check_files(),
        "Redis": check_redis(),
        "Imports": test_imports(),
        "Cache": test_cache(),
        "DAG Optimizer": test_dag_optimizer(),
        "Job Queue": test_job_queue()
    }
    
    print_summary(results)
    
    return 0 if all(results.values()) else 1

if __name__ == "__main__":
    sys.exit(main())
