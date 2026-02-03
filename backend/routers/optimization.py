"""
API Router for Backend Optimization Features
Exposes Redis caching, DAG optimization, and job queue via REST API
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
from backend_integration import get_backend_integration
from job_queue import JobPriority
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/optimization", tags=["optimization"])

# Pydantic models
class CircuitOptimizationRequest(BaseModel):
    circuit: Dict[str, Any]
    use_cache: bool = True

class CircuitSimulationRequest(BaseModel):
    circuit: Dict[str, Any]
    use_cache: bool = True
    optimize_first: bool = False

class JobSubmitRequest(BaseModel):
    job_type: str
    data: Dict[str, Any]
    priority: str = "NORMAL"  # LOW, NORMAL, HIGH, CRITICAL

class TranspileRequest(BaseModel):
    circuit: Dict[str, Any]
    backend_name: str

# Initialize backend integration
backend = get_backend_integration()

@router.post("/circuit/simulate")
async def simulate_circuit(request: CircuitSimulationRequest):
    """
    Simulate a quantum circuit with optional caching and optimization
    """
    try:
        if request.optimize_first:
            result = await backend.optimize_and_simulate(request.circuit)
        else:
            result = await backend.simulate_circuit_cached(
                request.circuit,
                use_cache=request.use_cache
            )
        
        return {
            "success": True,
            "data": result
        }
    except Exception as e:
        logger.error(f"Circuit simulation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/circuit/optimize")
async def optimize_circuit(request: CircuitOptimizationRequest):
    """
    Optimize a quantum circuit using DAG analysis
    """
    try:
        from dag_optimizer import DAGOptimizer
        
        # Check cache first
        if request.use_cache:
            from redis_cache import get_cache
            cache = get_cache()
            cached = cache.get_dag_optimization(request.circuit)
            if cached:
                return {
                    "success": True,
                    "from_cache": True,
                    "data": cached
                }
        
        # Optimize
        result = DAGOptimizer.optimize_circuit(request.circuit)
        
        # Cache result
        if request.use_cache:
            from redis_cache import get_cache
            cache = get_cache()
            cache.set_dag_optimization(request.circuit, result)
        
        return {
            "success": True,
            "from_cache": False,
            "data": result
        }
    except Exception as e:
        logger.error(f"Circuit optimization failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/circuit/transpile")
async def transpile_circuit(request: TranspileRequest):
    """
    Transpile circuit for specific backend with caching
    """
    try:
        qasm = await backend.transpile_and_cache(
            request.circuit,
            request.backend_name
        )
        
        return {
            "success": True,
            "qasm": qasm,
            "backend": request.backend_name
        }
    except Exception as e:
        logger.error(f"Circuit transpilation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/jobs/submit")
async def submit_job(request: JobSubmitRequest):
    """
    Submit a job to the queue
    """
    try:
        # Parse priority
        priority_map = {
            "LOW": JobPriority.LOW,
            "NORMAL": JobPriority.NORMAL,
            "HIGH": JobPriority.HIGH,
            "CRITICAL": JobPriority.CRITICAL
        }
        priority = priority_map.get(request.priority.upper(), JobPriority.NORMAL)
        
        job_id = await backend.job_queue.submit_job(
            request.job_type,
            request.data,
            priority=priority
        )
        
        return {
            "success": True,
            "job_id": job_id,
            "message": "Job submitted successfully"
        }
    except Exception as e:
        logger.error(f"Job submission failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/jobs/{job_id}")
async def get_job_status(job_id: str):
    """
    Get status of a job
    """
    try:
        status = await backend.job_queue.get_job_status(job_id)
        if not status:
            raise HTTPException(status_code=404, detail="Job not found")
        
        return {
            "success": True,
            "job": status
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get job status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/jobs/{job_id}")
async def cancel_job(job_id: str):
    """
    Cancel a job
    """
    try:
        cancelled = await backend.job_queue.cancel_job(job_id)
        if not cancelled:
            raise HTTPException(status_code=404, detail="Job not found or already completed")
        
        return {
            "success": True,
            "message": "Job cancelled successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to cancel job: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats")
async def get_system_stats():
    """
    Get system statistics (cache, queue, etc.)
    """
    try:
        stats = backend.get_system_stats()
        return {
            "success": True,
            "stats": stats
        }
    except Exception as e:
        logger.error(f"Failed to get stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/cache/clear")
async def clear_cache(pattern: Optional[str] = None):
    """
    Clear cache (optionally by pattern)
    """
    try:
        from redis_cache import get_cache
        cache = get_cache()
        
        if pattern:
            cache.invalidate_pattern(pattern)
            message = f"Cache cleared for pattern: {pattern}"
        else:
            cache.clear_all()
            message = "All cache cleared"
        
        return {
            "success": True,
            "message": message
        }
    except Exception as e:
        logger.error(f"Failed to clear cache: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/cache/stats")
async def get_cache_stats():
    """
    Get cache statistics
    """
    try:
        from redis_cache import get_cache
        cache = get_cache()
        stats = cache.get_stats()
        
        return {
            "success": True,
            "cache_stats": stats
        }
    except Exception as e:
        logger.error(f"Failed to get cache stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/queue/stats")
async def get_queue_stats():
    """
    Get job queue statistics
    """
    try:
        stats = backend.job_queue.get_queue_stats()
        return {
            "success": True,
            "queue_stats": stats
        }
    except Exception as e:
        logger.error(f"Failed to get queue stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/queue/cleanup")
async def cleanup_old_jobs(older_than_hours: int = 24):
    """
    Clean up old completed jobs
    """
    try:
        count = backend.job_queue.clear_completed_jobs(older_than_hours)
        return {
            "success": True,
            "message": f"Cleaned up {count} old jobs"
        }
    except Exception as e:
        logger.error(f"Failed to cleanup jobs: {e}")
        raise HTTPException(status_code=500, detail=str(e))
