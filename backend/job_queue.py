"""
Job Queue System with Priority Levels
Manages quantum computation jobs with priority-based scheduling
"""

import asyncio
import uuid
from typing import Dict, Any, Optional, Callable, List
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
import logging
from collections import deque

logger = logging.getLogger(__name__)

class JobPriority(Enum):
    """Job priority levels"""
    LOW = 0
    NORMAL = 1
    HIGH = 2
    CRITICAL = 3

class JobStatus(Enum):
    """Job execution status"""
    PENDING = "pending"
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

@dataclass
class Job:
    """Represents a quantum computation job"""
    id: str
    job_type: str  # 'simulation', 'ibm_execution', 'optimization', etc.
    data: Dict[str, Any]
    priority: JobPriority
    status: JobStatus = JobStatus.PENDING
    created_at: datetime = field(default_factory=datetime.now)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    retry_count: int = 0
    max_retries: int = 3
    
    def __lt__(self, other):
        """Compare jobs by priority (higher priority first)"""
        if self.priority.value != other.priority.value:
            return self.priority.value > other.priority.value
        # If same priority, older jobs first
        return self.created_at < other.created_at

class JobQueue:
    """Priority-based job queue with async execution"""
    
    def __init__(self, max_workers: int = 4):
        self.max_workers = max_workers
        self.jobs: Dict[str, Job] = {}
        self.queues: Dict[JobPriority, deque] = {
            priority: deque() for priority in JobPriority
        }
        self.running_jobs: Dict[str, asyncio.Task] = {}
        self.job_handlers: Dict[str, Callable] = {}
        self._lock = asyncio.Lock()
        self._running = False
        
        logger.info(f"Job queue initialized with {max_workers} workers")
    
    def register_handler(self, job_type: str, handler: Callable):
        """Register a handler function for a job type"""
        self.job_handlers[job_type] = handler
        logger.info(f"Registered handler for job type: {job_type}")
    
    async def submit_job(self, job_type: str, data: Dict[str, Any], 
                        priority: JobPriority = JobPriority.NORMAL) -> str:
        """Submit a new job to the queue"""
        job_id = str(uuid.uuid4())
        
        job = Job(
            id=job_id,
            job_type=job_type,
            data=data,
            priority=priority
        )
        
        async with self._lock:
            self.jobs[job_id] = job
            self.queues[priority].append(job_id)
            job.status = JobStatus.QUEUED
        
        logger.info(f"Job submitted: {job_id} (type: {job_type}, priority: {priority.name})")
        
        # Trigger job processing
        if self._running:
            asyncio.create_task(self._process_queue())
        
        return job_id
    
    async def get_job_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get status of a job"""
        job = self.jobs.get(job_id)
        if not job:
            return None
        
        return {
            "id": job.id,
            "type": job.job_type,
            "status": job.status.value,
            "priority": job.priority.name,
            "created_at": job.created_at.isoformat(),
            "started_at": job.started_at.isoformat() if job.started_at else None,
            "completed_at": job.completed_at.isoformat() if job.completed_at else None,
            "result": job.result,
            "error": job.error,
            "retry_count": job.retry_count
        }
    
    async def cancel_job(self, job_id: str) -> bool:
        """Cancel a pending or running job"""
        async with self._lock:
            job = self.jobs.get(job_id)
            if not job:
                return False
            
            if job.status == JobStatus.RUNNING:
                # Cancel running task
                task = self.running_jobs.get(job_id)
                if task:
                    task.cancel()
                    del self.running_jobs[job_id]
            elif job.status == JobStatus.QUEUED:
                # Remove from queue
                self.queues[job.priority].remove(job_id)
            
            job.status = JobStatus.CANCELLED
            job.completed_at = datetime.now()
            
        logger.info(f"Job cancelled: {job_id}")
        return True
    
    async def start(self):
        """Start the job queue processor"""
        self._running = True
        logger.info("Job queue started")
        
        # Start worker tasks
        workers = [
            asyncio.create_task(self._worker(i))
            for i in range(self.max_workers)
        ]
        
        await asyncio.gather(*workers)
    
    async def stop(self):
        """Stop the job queue processor"""
        self._running = False
        
        # Cancel all running jobs
        for task in self.running_jobs.values():
            task.cancel()
        
        logger.info("Job queue stopped")
    
    async def _worker(self, worker_id: int):
        """Worker coroutine that processes jobs"""
        logger.info(f"Worker {worker_id} started")
        
        while self._running:
            job_id = await self._get_next_job()
            
            if not job_id:
                # No jobs available, wait a bit
                await asyncio.sleep(0.1)
                continue
            
            try:
                await self._execute_job(job_id, worker_id)
            except Exception as e:
                logger.error(f"Worker {worker_id} error: {e}")
        
        logger.info(f"Worker {worker_id} stopped")
    
    async def _get_next_job(self) -> Optional[str]:
        """Get next job from queue (highest priority first)"""
        async with self._lock:
            # Check queues in priority order (highest first)
            for priority in sorted(JobPriority, key=lambda p: p.value, reverse=True):
                queue = self.queues[priority]
                if queue:
                    return queue.popleft()
            
            return None
    
    async def _execute_job(self, job_id: str, worker_id: int):
        """Execute a job"""
        job = self.jobs.get(job_id)
        if not job:
            return
        
        handler = self.job_handlers.get(job.job_type)
        if not handler:
            job.status = JobStatus.FAILED
            job.error = f"No handler registered for job type: {job.job_type}"
            job.completed_at = datetime.now()
            logger.error(job.error)
            return
        
        job.status = JobStatus.RUNNING
        job.started_at = datetime.now()
        
        logger.info(f"Worker {worker_id} executing job: {job_id}")
        
        try:
            # Execute handler
            if asyncio.iscoroutinefunction(handler):
                result = await handler(job.data)
            else:
                result = await asyncio.to_thread(handler, job.data)
            
            job.result = result
            job.status = JobStatus.COMPLETED
            job.completed_at = datetime.now()
            
            logger.info(f"Job completed: {job_id}")
            
        except Exception as e:
            logger.error(f"Job {job_id} failed: {e}")
            
            # Retry logic
            if job.retry_count < job.max_retries:
                job.retry_count += 1
                job.status = JobStatus.QUEUED
                
                # Re-queue with same priority
                async with self._lock:
                    self.queues[job.priority].append(job_id)
                
                logger.info(f"Job {job_id} re-queued (retry {job.retry_count}/{job.max_retries})")
            else:
                job.status = JobStatus.FAILED
                job.error = str(e)
                job.completed_at = datetime.now()
    
    async def _process_queue(self):
        """Trigger queue processing (called when new jobs are added)"""
        # This is a no-op if workers are already running
        # Workers will pick up new jobs automatically
        pass
    
    def get_queue_stats(self) -> Dict[str, Any]:
        """Get queue statistics"""
        stats = {
            "total_jobs": len(self.jobs),
            "running": len(self.running_jobs),
            "queued_by_priority": {},
            "status_counts": {}
        }
        
        # Count queued jobs by priority
        for priority, queue in self.queues.items():
            stats["queued_by_priority"][priority.name] = len(queue)
        
        # Count jobs by status
        for job in self.jobs.values():
            status = job.status.value
            stats["status_counts"][status] = stats["status_counts"].get(status, 0) + 1
        
        return stats
    
    def clear_completed_jobs(self, older_than_hours: int = 24):
        """Clear completed/failed jobs older than specified hours"""
        cutoff = datetime.now().timestamp() - (older_than_hours * 3600)
        
        to_remove = []
        for job_id, job in self.jobs.items():
            if job.status in [JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED]:
                if job.completed_at and job.completed_at.timestamp() < cutoff:
                    to_remove.append(job_id)
        
        for job_id in to_remove:
            del self.jobs[job_id]
        
        logger.info(f"Cleared {len(to_remove)} old jobs")
        return len(to_remove)

# Global job queue instance
_job_queue: Optional[JobQueue] = None

def get_job_queue(max_workers: int = 4) -> JobQueue:
    """Get or create global job queue instance"""
    global _job_queue
    if _job_queue is None:
        _job_queue = JobQueue(max_workers=max_workers)
    return _job_queue
