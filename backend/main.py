from fastapi import FastAPI, HTTPException, Request, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import asyncio
import time
import os
import json
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
import threading
from contextlib import asynccontextmanager
from database import init_database, create_tables, get_session
from sqlalchemy.ext.asyncio import AsyncSession
import db_models
from dotenv import load_dotenv

# Load .env from parent directory
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
load_dotenv(env_path)

# Import our enhanced modules
from config import config
from container import container
from cache import quantum_cache
from monitoring import (
    metrics_collector, metrics_middleware, get_metrics, get_health,
    REQUEST_COUNT, SIMULATION_DURATION, ACTIVE_WORKERS
)
from rate_limiting import (
    limiter, quantum_rate_limit_middleware, rate_limit_exceeded_handler,
    limit_general_requests, limit_ibm_requests, limit_simulation_requests
)
from validation_utils import (
    validate_circuit_data, validate_quantum_execution_request,
    validate_ibm_execution_request, validate_token_format,
    validate_job_id_format, sanitize_string_input,
    build_validation_error_response, build_server_error_response
)
from enhanced_error_handling import (
    QuantumAPIError, ValidationError, CircuitExecutionError,
    IBMQuantumError, setup_enhanced_error_handling,
    build_error_response, build_success_response,
    perform_health_checks
)
from models import (
    QuantumExecutionRequest, QuantumExecutionResult, IBMConnectRequest,
    IBMConnectResponse, IBMBackendsResponse, IBMExecuteRequest,
    IBMExecuteResponse, IBMJobStatusResponse, AIQuestionRequest,
    AIQuestionResponse, CacheStatsResponse, HealthResponse,
    QuantumMLFeatureMapRequest, QuantumMLKernelRequest,
    QuantumMLVQCTrainRequest, QuantumMLVQCPredictRequest,
    DatasetGenerateRequest, DatasetGenerateResponse,
    MedicalLoadRequest, MedicalAnalyzeRequest, ErrorResponse,
    IBMCloudAuthRequest, WatsonXAuthRequest, QuantumStudyRequest,
    QuantumStudyResponse, QuantumReportResponse, DatasetDownloadRequest
)

# Import legacy modules (keeping for compatibility)
from quantum_executor import execute_circuit_locally
from quantum_api_types import BackendType, QuantumExecutionOptions
from quantum_api_bridge import QuantumAPI, execute_quantum_circuit_sync
from quantum_knowledge_base import ask_ai_question
from quantum_worker import QuantumWorker, QuantumWorkerPool, simulate_circuit_async
from ts_sim_port import Circuit as TsCircuit, Gate as TsGate, simulate_circuit as simulate_circuit_ts
from quantum_ml_primitives import (
    FeatureMap, ZFeatureMap, ZZFeatureMap, AmplitudeEncoding,
    QuantumKernel, FidelityQuantumKernel, ProjectedQuantumKernel,
    QNNLayer, VariationalLayer, DataEncodingLayer, MeasurementLayer,
    VariationalQuantumClassifier, VQCConfig,
    generate_classification_dataset, generate_regression_dataset,
    evaluate_classification, evaluate_regression,
    serialize_model, deserialize_model
)
from quantum_data_preprocessing import (
    QuantumDataPreprocessor, DataSample,
    standardize_features, normalize_features, encode_for_quantum,
    reduce_dimensionality, create_train_validation_split,
    analyze_quantum_readiness
)

from medical_core import medical_core, download_csv_from_drive
from symptom_analysis import symptom_analyzer
from pydantic import BaseModel

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# IBM Quantum service
from ibm_service import ibm_service_instance
import ibm_service
print(f"DEBUG: Loading ibm_service from: {ibm_service.__file__}")

from quantum_advantage_platform import quantum_platform
from ibm_cloud_auth import ibm_cloud_auth
from watsonx_service import watsonx_service

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for application startup and shutdown"""
    # Startup: Initialize services
    try:
        init_database()
        await create_tables()
        container.logger().info("database_initialized_on_startup")
    except Exception as e:
        container.logger().error("database_init_failed", error=str(e))
    
    # Load medical dataset from DB in background to avoid event loop block
    async def load_db_data():
        print("DEBUG: ASYNC DB LOAD STARTED")
        try:
            from medical_core import medical_core
            async for session in get_session():
                print("DEBUG: SESSION ACQUIRED")
                result = await medical_core.load_from_db(session)
                if result:
                    print(f"DEBUG: LOADED {result.get('sample_count')} RECORDS")
                    container.logger().info("medical_dataset_loaded_from_db", sample_count=result.get('sample_count', 0))
                else:
                    print("DEBUG: NO RECORDS FOUND")
                    container.logger().warning("no_medical_data_found_in_db")
                break
        except Exception as e:
            print(f"DEBUG: LOAD ERROR: {e}")
            container.logger().warning("medical_dataset_load_failed", error=str(e))
            
    asyncio.create_task(load_db_data())

    # Initialize Symptom Analyzer (Background)
    async def init_symptom_analyzer():
        print("DEBUG: SYMPTOM ANALYZER INIT STARTED - Downloading Google Drive Dataset...")
        try:
             # Run in thread pool to avoid blocking
             loop = asyncio.get_running_loop()
             await loop.run_in_executor(None, symptom_analyzer.train)
             print("DEBUG: SYMPTOM ANALYZER TRAINED SUCCESSFULLY")
        except Exception as e:
             print(f"DEBUG: SYMPTOM ANALYZER FAILED: {e}")

    # asyncio.create_task(init_symptom_analyzer())

    yield

    # Shutdown: Cleanup
    try:
        from database import close_database
        await close_database()
        container.logger().info("database_closed_on_shutdown")
    except Exception as e:
        container.logger().error("database_shutdown_error", error=str(e))

# Create FastAPI app with enhanced configuration
app = FastAPI(
    title="Quantum Backend API",
    version="2.0.0",
    description="Enhanced Quantum Computing Backend with Advanced Features",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Import API versioning
from api_versioning import version_middleware, versioned_router, create_versioned_router, APIVersion
from routers import v1, v2, analytics, gamification, tutor

# Register versioned routers
versioned_router.register_version("v1", v1.v1_router, deprecated=True)
versioned_router.register_version("v2", v2.v2_router, deprecated=False)

# Include versioned routers
app.include_router(v1.v1_router)
app.include_router(v2.v2_router)
app.include_router(analytics.router)
app.include_router(gamification.router)
app.include_router(tutor.router)

# Add versioning middleware
@app.middleware("http")
async def api_version_middleware(request: Request, call_next):
    return await version_middleware(request, call_next)

# Setup security middleware
# from security import setup_security_middleware
# setup_security_middleware(app)

# Analytics router removed
# from job_analytics import router as analytics_router
# app.include_router(analytics_router)

# ============================================================================
# Enhanced CORS Configuration
# ============================================================================
# Use regex to allow any local/network origin while supporting credentials
#app.add_middleware(
   # CORSMiddleware,
    #allow_origins=["*"],  # Allow all origins
    #allow_credentials=False, # Credentials cannot be true with wildcards, and aren't used for JWT/cookies here
    #allow_methods=["*"],
    #allow_headers=["*"],
#)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (required for local network access)
    allow_credentials=False, # Must be False when using wildcard origin
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# Enhanced Middleware Stack
# ============================================================================

# Rate limiting middleware
# app.add_middleware(
#     limiter,
#     error_handler=rate_limit_exceeded_handler
# )

# Custom quantum rate limiting
# @app.middleware("http")
# async def enhanced_rate_limiting_middleware(request: Request, call_next):
#     return await quantum_rate_limit_middleware(request, call_next)

# Metrics collection middleware
# @app.middleware("http")
# async def enhanced_metrics_middleware(request: Request, call_next):
#     return await metrics_middleware(request, call_next)

# Security
security = HTTPBearer(auto_error=False)

# ============================================================================
# Enhanced Health and Monitoring Endpoints
# ============================================================================

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Enhanced health check with comprehensive dependency verification"""
    try:
        # Get basic health from monitoring module
        basic_health = await metrics_collector.get_health_status()

        # Perform additional comprehensive checks
        detailed_checks = perform_health_checks()

        # Combine results
        combined_health = {
            **basic_health,
            "detailed_checks": detailed_checks.get("checks", {}),
            "overall_status": detailed_checks.get("status", "unknown")
        }

        return HealthResponse(**combined_health)

    except Exception as e:
        container.logger().error("health_check_failed", error=str(e))
        return HealthResponse(
            status="unhealthy",
            timestamp=time.time(),
            services={"error": str(e)}
        )

@app.get("/api/status")
async def system_status():
    """Detailed system status endpoint for monitoring"""
    try:
        # Get comprehensive health information
        health_data = perform_health_checks()

        # Get cache statistics
        cache_stats = await quantum_cache.get_stats()

        # Get worker pool status
        try:
            from container import container
            worker_pool = container.worker_pool()
            worker_status = worker_pool.get_pool_status() if hasattr(worker_pool, 'get_pool_status') else {}
        except:
            worker_status = {"error": "Worker pool not available"}

        # Get metrics summary
        try:
            metrics_summary = await get_metrics()
        except:
            metrics_summary = {"error": "Metrics not available"}

        return build_success_response({
            "health": health_data,
            "cache": cache_stats,
            "workers": worker_status,
            "metrics": metrics_summary,
            "timestamp": time.time()
        })

    except Exception as e:
        container.logger().error("system_status_failed", error=str(e))
        return build_error_response(e, 500, "SYSTEM_STATUS_ERROR")

@app.get("/metrics")
async def prometheus_metrics():
    """Prometheus metrics endpoint"""
    return await get_metrics()

# Cache management endpoints
@app.get("/api/cache/stats", response_model=CacheStatsResponse)
async def get_cache_stats():
    """Get detailed cache statistics"""
    stats = await quantum_cache.get_stats()
    return CacheStatsResponse(success=True, cache=stats)

@app.delete("/api/cache/clear")
async def clear_cache():
    """Clear all cached data"""
    await quantum_cache.clear_all()
    container.logger().info("cache_cleared", source="api")
    return {
        "success": True,
        "message": "All caches cleared successfully"
    }

# ============================================================================
# Enhanced IBM Quantum Endpoints
# ============================================================================

@app.post("/api/ibm/connect")
async def connect_ibm(request: IBMConnectRequest):
    """Simple IBM connection point"""
    try:
        print(f"Connecting to IBM with token: {request.token[:10]}...")
        result = await ibm_service_instance.validate_token(request.token)
        print(f"IBM Result: {result.get('success')}")
        return result
    except Exception as e:
        print(f"IBM Error: {e}")
        return {"success": False, "error": str(e)}


@app.get("/api/ibm/backends", response_model=IBMBackendsResponse)
@limit_general_requests()
async def get_ibm_backends(request: Request, token: str):
    """Get available IBM Quantum backends with caching and logging"""
    try:
        print(f"[IBM] 🔍 Fetching backends for token: {token[:10]}...")
        
        # Check cache first
        cache_key = f"ibm_backends:{token[:16]}"
        cached_result = await quantum_cache.backend.get(cache_key)

        if cached_result:
            await metrics_collector.record_cache_hit("ibm_backends")
            container.logger().debug("ibm_backends_cache_hit")
            print(f"[IBM] ✅ Backends retrieved from cache ({len(cached_result.get('backends', []))} backends)")
            return IBMBackendsResponse(**cached_result)

        await metrics_collector.record_cache_miss("ibm_backends")

        result = await ibm_service_instance.get_backends(token)

        # Cache for 5 minutes
        if result.get("success"):
            backend_count = len(result.get("backends", []))
            print(f"[IBM] ✅ Found {backend_count} backends")
            await quantum_cache.backend.set(cache_key, result, ttl=300)
        else:
            print(f"[IBM] ❌ Failed to get backends: {result.get('error', 'Unknown error')}")

        return IBMBackendsResponse(**result)

    except Exception as e:
        error_msg = str(e)
        print(f"[IBM] ❌ Backends error: {error_msg}")
        container.logger().error("ibm_backends_error", error=error_msg)
        raise IBMQuantumError(f"Failed to get IBM backends: {error_msg}")


@app.post("/api/ibm/execute", response_model=IBMExecuteResponse)
@limit_ibm_requests()
async def execute_ibm(request: Request, exec_request: IBMExecuteRequest):
    """Execute circuit on IBM Quantum with enhanced validation, error handling and logging"""
    start_time = time.time()
    request_data = exec_request.dict()

    try:
        print(f"[IBM] 🚀 Submitting job to backend: {exec_request.backend}")
        print(f"[IBM] 📊 Circuit: {exec_request.circuit.numQubits} qubits, {len(exec_request.circuit.gates)} gates, {exec_request.shots} shots")

        # Enhanced input validation
        is_valid, validation_error, validated_data = validate_ibm_execution_request(request_data)
        if not is_valid:
            raise ValidationError(validation_error, {"field": "ibm_execution_request"})

        # Additional circuit validation
        circuit_valid, circuit_error, _ = validate_circuit_data(validated_data["circuit"])
        if not circuit_valid:
            raise ValidationError(circuit_error, {"field": "circuit"})

        container.logger().info("ibm_execution_started",
                            backend=exec_request.backend,
                            shots=exec_request.shots,
                            circuit_size=len(exec_request.circuit.gates))

        result = await ibm_service_instance.submit_job(
            exec_request.token,
            exec_request.backend,
            exec_request.circuit.dict(),
            exec_request.shots,
            instance=exec_request.instance
        )

        duration = time.time() - start_time
        await metrics_collector.record_ibm_api_call("execute", result.get("success", False))

        if result.get("success"):
            job_id = result.get("jobId")
            status = result.get("status")
            print(f"[IBM] ✅ Job submitted successfully!")
            print(f"[IBM] 📋 Job ID: {job_id}")
            print(f"[IBM] 📊 Status: {status}")
            container.logger().info("ibm_job_submitted",
                                job_id=job_id,
                                status=status,
                                duration=duration)
        else:
            error = result.get("error", "Unknown error")
            print(f"[IBM] ❌ Job submission failed: {error}")
            container.logger().warning("ibm_job_failed",
                                    error=error,
                                    duration=duration)

        return IBMExecuteResponse(**result)

    except ValidationError:
        # Re-raise validation errors as-is
        raise
    except Exception as e:
        duration = time.time() - start_time
        await metrics_collector.record_ibm_api_call("execute", False)
        error_msg = str(e)
        print(f"[IBM] ❌ Execution error: {error_msg}")
        container.logger().error("ibm_execution_error", error=error_msg, duration=duration)
        raise IBMQuantumError(f"IBM Quantum execution failed: {error_msg}", details={"duration": duration})


@app.get("/api/ibm/job/{job_id}", response_model=IBMJobStatusResponse)
@limit_general_requests()
async def get_ibm_job(request: Request, job_id: str, token: str):
    """Get IBM Quantum job status with caching and logging"""
    try:
        print(f"[IBM] 🔍 Checking job status: {job_id}")
        
        # Check cache first (short TTL for job status)
        cache_key = f"ibm_job:{job_id}"
        cached_result = await quantum_cache.backend.get(cache_key)

        if cached_result:
            await metrics_collector.record_cache_hit("ibm_job_status")
            status = cached_result.get("status", "unknown")
            print(f"[IBM] 📋 Job status (cached): {status}")
            return IBMJobStatusResponse(**cached_result)

        await metrics_collector.record_cache_miss("ibm_job_status")

        result = await ibm_service_instance.get_job_result(token, job_id)

        # Cache for 30 seconds (job status changes frequently)
        if result.get("success"):
            status = result.get("status", "unknown")
            print(f"[IBM] 📋 Job status: {status}")
            
            if status == "DONE":
                results = result.get("results", {})
                print(f"[IBM] ✅ Job completed! Results: {len(results)} measurement outcomes")
                if results:
                    # Print first few results
                    sample_results = dict(list(results.items())[:5])
                    print(f"[IBM] 📊 Sample results: {sample_results}")
            
            await quantum_cache.backend.set(cache_key, result, ttl=30)

        await metrics_collector.record_ibm_api_call("job_status", result.get("success", False))

        return IBMJobStatusResponse(**result)

    except Exception as e:
        error_msg = str(e)
        print(f"[IBM] ❌ Job status error: {error_msg}")
        container.logger().error("ibm_job_status_error", job_id=job_id, error=error_msg)
        raise IBMQuantumError(f"Failed to get job status: {error_msg}", details={"job_id": job_id})

# --- Quantum Advantage Research Platform Endpoints ---

@app.post("/api/quantum-study", response_model=QuantumStudyResponse)
async def run_study(request: QuantumStudyRequest):
    """Run a quantum advantage study with AI optimization"""
    try:
        container.logger().info("api_study_request", algorithm=request.algorithmType)
        result = await quantum_platform.run_quantum_advantage_study(
            algorithm_type=request.algorithmType,
            circuit_data=request.circuit.dict(),
            token=request.token,
            backend_name=request.backend
        )
        return QuantumStudyResponse(**result)
    except Exception as e:
        container.logger().error("study_failed", error=str(e))
        return QuantumStudyResponse(success=False, error=str(e))

@app.get("/api/quantum-report/{job_id}", response_model=QuantumReportResponse)
async def get_report(job_id: str):
    """Generate research report for a job"""
    try:
        # Mock results for demo
        study_results = {
            "job_id": job_id,
            "backend_name": "ibm_fez",
            "shots": 1024,
            "advantage_ratio": "1.25x"
        }
        result = await quantum_platform.generate_quantum_report(study_results)
        return QuantumReportResponse(**result)
    except Exception as e:
        return QuantumReportResponse(success=False, report=f"Report failed: {str(e)}")

@app.post("/watsonx/authenticate")
async def authenticate_watsonx(request: WatsonXAuthRequest):
    """Authenticate with watsonx.ai"""
    try:
        # For demo, just validate API key exists
        if not request.apiKey:
            return {"success": False, "error": "API Key required"}
        return {"success": True, "message": "watsonx.ai authenticated successfully"}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/api/ibm/authenticate-cloud")
async def authenticate_ibm_cloud(request: IBMCloudAuthRequest):
    """Authenticate with IBM Cloud IAM and return bearer token + instance"""
    token = await ibm_cloud_auth.get_bearer_token(request.apiKey)
    if token:
        # Register the mapping so Qiskit can find the real API key later
        ibm_service_instance.register_cloud_token(token, request.apiKey, instance=request.instance)
        
        return {
            "success": True, 
            "token": token,
            "instance": request.instance
        }
    return {"success": False, "error": "IBM Cloud authentication failed"}


# Keep existing endpoints for backward compat

# Authentication error (REMOVED)


# ============================================================================
# Enhanced Circuit Execution Endpoint
# ============================================================================

@app.post("/api/quantum/execute", response_model=QuantumExecutionResult)
@limit_simulation_requests()
async def execute_circuit(request: Request, exec_request: QuantumExecutionRequest):
    """Execute quantum circuit with enhanced validation, caching, metrics, and error handling"""
    start_time = time.time()
    request_data = exec_request.dict()

    try:
        container.logger().info("circuit_execution_started",
                            backend=exec_request.backend,
                            num_qubits=exec_request.circuit.numQubits,
                            num_gates=len(exec_request.circuit.gates),
                            shots=exec_request.shots)

        # Enhanced input validation
        is_valid, validation_error, validated_data = validate_quantum_execution_request(request_data)
        if not is_valid:
            raise ValidationError(validation_error, {"field": "execution_request"})

        # Additional circuit validation
        circuit_valid, circuit_error, _ = validate_circuit_data(validated_data["circuit"])
        if not circuit_valid:
            raise ValidationError(circuit_error, {"field": "circuit"})

        # Check cache for simulation results
        cached_result = await quantum_cache.get_simulation_result(
            exec_request.circuit.dict(),
            exec_request.backend.value
        )

        if cached_result:
            await metrics_collector.record_cache_hit("simulation")
            container.logger().info("circuit_cache_hit", backend=exec_request.backend.value)
            return QuantumExecutionResult(**cached_result)

        await metrics_collector.record_cache_miss("simulation")

        # Map backend name to BackendType
        backend_mapping = {
            "local": BackendType.LOCAL,
            "aer_simulator": BackendType.AER_SIMULATOR,
            "custom_simulator": BackendType.CUSTOM_SIMULATOR,
            "wasm": BackendType.WASM,
        }
        backend = backend_mapping.get(exec_request.backend.value, BackendType.LOCAL)

        # Sanitize token if provided
        sanitized_token = None
        if exec_request.token:
            if not validate_token_format(exec_request.token):
                raise ValidationError("Invalid token format", {"field": "token"})
            sanitized_token = sanitize_string_input(exec_request.token)

        # Create execution options
        options = QuantumExecutionOptions(
            backend=backend,
            token=sanitized_token,
            shots=exec_request.shots,
            initial_state=exec_request.initialState or "ket0",
            custom_state=exec_request.customState,
            optimization_level=1,
            enable_transpilation=True,
            backend_name=exec_request.backend.value
        )

        # Execute using unified API
        result = await QuantumAPI().execute_quantum_circuit(exec_request.circuit.dict(), options)

        # Record metrics
        duration = time.time() - start_time
        await metrics_collector.record_simulation(
            exec_request.backend.value,
            result.success,
            duration
        )

        # Format response
        response_data = {
            "success": result.success,
            "method": result.method,
            "backend": result.backend,
            "executionTime": result.executionTime
        }

        if result.qubitResults:
            response_data["qubitResults"] = result.qubitResults
        if result.jobId:
            response_data["jobId"] = result.jobId
        if result.status:
            response_data["status"] = result.status
        if result.message:
            response_data["message"] = result.message
        if result.error:
            response_data["error"] = result.error

        # Cache successful results
        if result.success and not result.job_id:  # Don't cache async jobs
            await quantum_cache.set_simulation_result(
                exec_request.circuit.dict(),
                exec_request.backend.value,
                response_data
            )

        container.logger().info("circuit_execution_completed",
                            success=result.success,
                            duration=duration,
                            backend=exec_request.backend.value)

        return QuantumExecutionResult(**response_data)

    except ValidationError:
        # Re-raise validation errors as-is
        raise
    except Exception as e:
        import traceback
        with open("error_traceback.log", "w") as f:
            f.write(traceback.format_exc())
            
        duration = time.time() - start_time
        await metrics_collector.record_simulation(exec_request.backend.value, False, duration)

        container.logger().error("circuit_execution_failed",
                              error=str(e),
                              backend=exec_request.backend.value,
                              duration=duration)

        raise CircuitExecutionError(
            f"Failed to execute quantum circuit: {str(e)}",
            details={
                "backend": exec_request.backend.value,
                "duration": duration,
                "num_qubits": exec_request.circuit.numQubits,
                "num_gates": len(exec_request.circuit.gates)
            }
        )


# ---------------------------------------------------------------------------
# TS-port real-valued simulator (density-matrix) wrapper
# ---------------------------------------------------------------------------
@app.post("/api/quantum/execute/ts-port")
async def execute_circuit_ts_port(data: Dict[str, Any]):
    """
    Execute using the Python port of the TS core (ts_sim_port.py).
    Accepts: { circuit: { numQubits, gates:[{name, qubits, parameters?}] }, initialState?: string }
    """
    try:
        circuit_data = data.get("circuit")
        initial_state = data.get("initialState")
        if not circuit_data or "numQubits" not in circuit_data or "gates" not in circuit_data:
            raise HTTPException(status_code=400, detail="Invalid circuit payload")

        gates = [
            TsGate(
                name=g.get("name"),
                qubits=g.get("qubits", []),
                parameters=g.get("parameters"),
            )
            for g in circuit_data.get("gates", [])
        ]
        circuit = TsCircuit(numQubits=circuit_data["numQubits"], gates=gates)

        result = simulate_circuit_ts(circuit, initial_state)
        return {
            "success": True,
            "backend": "ts-port",
            "result": {
                "statevector": result.get("statevector"),
                "probabilities": result.get("probabilities"),
                "densityMatrix": result.get("densityMatrix"),
                "reducedStates": result.get("reducedStates"),
            },
        }
    except (HTTPException, QuantumAPIError):
        raise
    except Exception as e:
        container.logger().error("ts_port_execution_error", error=str(e))
        raise CircuitExecutionError(f"TS-port execution failed: {str(e)}", details={"backend": "ts-port"})


# ---------------------------------------------------------------------------
# Complex statevector simulator wrapper (qiskit_simulator.py)
# ---------------------------------------------------------------------------
@app.post("/api/quantum/execute/statevector")
async def execute_circuit_statevector(data: Dict[str, Any]):
    """
    Execute using backend/qiskit_simulator.py (Qiskit-based simulation).
    Accepts: { circuit: { numQubits, gates:[{name, qubits, parameters?}] }, initialState: 'ket0'|..., customState? }
    """
    try:
        from qiskit_simulator import execute_circuit as execute_statevector

        result = execute_statevector(
            {
                "circuit": data.get("circuit"),
                "initialState": data.get("initialState", "ket0"),
                "customState": data.get("customState"),
            }
        )
        if not result.get("success"):
            raise HTTPException(status_code=500, detail=result.get("error", "Statevector execution failed"))
        return {
            "success": True,
            "backend": "statevector",
            "result": result,
        }
    except (HTTPException, QuantumAPIError):
        raise
    except Exception as e:
        container.logger().error("statevector_execution_error", error=str(e))
        raise CircuitExecutionError(f"Statevector execution failed: {str(e)}", details={"backend": "statevector"})

@app.post("/api/quantum/noise-simulation")
async def run_noise_simulation(data: Dict[str, Any]):
    """
    Run a noisy quantum simulation using QuantumSimulator.
    Accepts: { circuit, initialState, noise: { enabled: true, ... } }
    """
    try:
        from quantum_simulator import execute_circuit as simulate_with_noise
        result = simulate_with_noise(data)
        return result
    except Exception as e:
        container.logger().error("noise_simulation_error", error=str(e))
        return {"success": False, "error": str(e)}

# Get available backends
@app.get("/api/quantum/backends")
async def get_backends():
    try:
        # Return only local backends
        default_backends = [
            {"id": "local", "name": "Local Simulator", "status": "available", "qubits": 24, "type": "simulator"},
            {"id": "custom_simulator", "name": "Custom Simulator", "status": "available", "qubits": 20, "type": "simulator"},
            {"id": "simulator_statevector", "name": "Statevector Simulator", "status": "available", "qubits": 24, "type": "simulator"},
            {"id": "simulator_mps", "name": "Matrix Product State Simulator", "status": "available", "qubits": 100, "type": "simulator"}
        ]
        return {"success": True, "backends": default_backends}

    except Exception as e:
        container.logger().error("backend_listing_error", error=str(e))
        return {"success": True, "backends": []}

# Job management endpoints (REMOVED)


# ============================================================================
# Enhanced AI Assistant Endpoint
# ============================================================================

@app.post("/api/ai/ask", response_model=AIQuestionResponse)
@limit_general_requests()
async def ask_ai(request: Request, ai_request: AIQuestionRequest):
    """Get AI assistance with caching and enhanced error handling"""
    start_time = time.time()

    try:
        container.logger().info("ai_question_received", question_length=len(ai_request.question))

        # Check cache first
        cached_answer = await quantum_cache.get_ai_response(ai_request.question)
        if cached_answer:
            await metrics_collector.record_cache_hit("ai_responses")
            container.logger().info("ai_cache_hit")
            return AIQuestionResponse(
                success=True,
                question=ai_request.question,
                answer=cached_answer,
                timestamp=datetime.utcnow().isoformat()
            )

        await metrics_collector.record_cache_miss("ai_responses")

        # Get AI response
        answer = await ask_ai_question(ai_request.question)

        # Cache the response
        await quantum_cache.set_ai_response(ai_request.question, answer)

        duration = time.time() - start_time

        container.logger().info("ai_question_answered",
                            duration=duration,
                            answer_length=len(answer))

        return AIQuestionResponse(
            success=True,
            question=ai_request.question,
            answer=answer,
            timestamp=datetime.utcnow().isoformat()
        )

    except Exception as e:
        duration = time.time() - start_time
        container.logger().error("ai_question_failed",
                             error=str(e),
                             duration=duration,
                             question_length=len(ai_request.question))

        raise QuantumAPIError(
            "Failed to get AI response" if not config.debug else str(e),
            status_code=500,
            error_code="AI_SERVICE_ERROR",
            details={"question_length": len(ai_request.question), "duration": duration}
        )



# ============================================================================
# QUANTUM MACHINE LEARNING ENDPOINTS
# ============================================================================

# Feature Map Operations
@app.post("/api/quantum-ml/feature-maps")
async def create_feature_map(data: Dict[str, Any]):
    """Create and apply a quantum feature map"""
    try:
        map_type = data.get("type", "z")
        num_qubits = data.get("numQubits", 2)
        input_data = data.get("data", [])

        # Create feature map
        if map_type.lower() == "z":
            feature_map = ZFeatureMap(num_qubits)
        elif map_type.lower() == "zz":
            feature_map = ZZFeatureMap(num_qubits)
        elif map_type.lower() == "amplitude":
            feature_map = AmplitudeEncoding(num_qubits)
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported feature map type: {map_type}")

        # Encode data
        circuit = feature_map.encode(input_data)

        return {
            "success": True,
            "featureMap": {
                "name": feature_map.name,
                "description": feature_map.description,
                "numQubits": num_qubits
            },
            "circuit": {
                "numQubits": circuit.num_qubits,
                "gates": [{"name": g.name, "qubits": g.qubits, "parameters": g.parameters} for g in circuit.gates]
            }
        }

    except Exception as e:
        container.logger().error("feature_map_error", error=str(e))
        raise QuantumAPIError(f"Failed to create feature map: {str(e)}", status_code=500, error_code="ML_FEATURE_MAP_ERROR")

# Quantum Kernel Operations
@app.post("/api/quantum-ml/kernels")
async def compute_quantum_kernel(data: Dict[str, Any]):
    """Compute quantum kernel between data points"""
    try:
        kernel_type = data.get("type", "fidelity")
        feature_map_type = data.get("featureMap", "z")
        x1 = data.get("x1", [])
        x2 = data.get("x2", [])

        # Create feature map
        num_qubits = max(len(x1), len(x2), 2)
        if feature_map_type.lower() == "z":
            feature_map = ZFeatureMap(num_qubits)
        elif feature_map_type.lower() == "zz":
            feature_map = ZZFeatureMap(num_qubits)
        else:
            feature_map = ZFeatureMap(num_qubits)

        # Create kernel
        if kernel_type.lower() == "fidelity":
            kernel = FidelityQuantumKernel()
        elif kernel_type.lower() == "projected":
            kernel = ProjectedQuantumKernel()
        else:
            kernel = FidelityQuantumKernel()

        # Compute kernel
        kernel_value = kernel.compute_kernel(x1, x2, feature_map)

        return {
            "success": True,
            "kernel": {
                "type": kernel.name,
                "value": kernel_value,
                "featureMap": feature_map.name
            }
        }

    except Exception as e:
        container.logger().error("quantum_kernel_error", error=str(e))
        raise QuantumAPIError(f"Failed to compute quantum kernel: {str(e)}", status_code=500, error_code="ML_KERNEL_ERROR")

# Variational Quantum Circuit Operations
@app.post("/api/quantum-ml/variational-circuits")
async def create_variational_circuit(data: Dict[str, Any]):
    """Create a variational quantum circuit"""
    try:
        num_qubits = data.get("numQubits", 2)
        num_layers = data.get("numLayers", 1)
        ansatz_type = data.get("ansatzType", "hardware_efficient")
        parameters = data.get("parameters", [])

        # Create variational layer
        variational_layer = VariationalLayer(
            num_qubits=num_qubits,
            num_layers=num_layers,
            ansatz_type=ansatz_type
        )

        # Build circuit
        circuit = variational_layer.build_circuit(parameters)

        return {
            "success": True,
            "circuit": {
                "numQubits": circuit.num_qubits,
                "gates": [{"name": g.name, "qubits": g.qubits, "parameters": g.parameters} for g in circuit.gates],
                "numParameters": variational_layer.num_parameters
            },
            "layer": {
                "name": variational_layer.name,
                "description": variational_layer.description,
                "numParameters": variational_layer.num_parameters
            }
        }

    except Exception as e:
        container.logger().error("variational_circuit_error", error=str(e))
        raise QuantumAPIError(f"Failed to create variational circuit: {str(e)}", status_code=500, error_code="ML_VARIATIONAL_ERROR")

# Variational Quantum Classifier
@app.post("/api/quantum-ml/vqc/train")
async def train_vqc(data: Dict[str, Any]):
    """Train a Variational Quantum Classifier"""
    try:
        # Extract configuration
        feature_map_type = data.get("featureMap", "z")
        num_qubits = data.get("numQubits", 2)
        variational_layers = data.get("variationalLayers", 1)
        training_data = data.get("trainingData", [])
        labels = data.get("labels", [])
        max_iterations = data.get("maxIterations", 100)

        # Create feature map
        if feature_map_type.lower() == "z":
            feature_map = ZFeatureMap(num_qubits)
        elif feature_map_type.lower() == "zz":
            feature_map = ZZFeatureMap(num_qubits)
        else:
            feature_map = ZFeatureMap(num_qubits)

        # Create variational layer
        variational_layer = VariationalLayer(num_qubits, variational_layers)

        # Create measurement layer
        measurement_layer = MeasurementLayer(num_qubits)

        # Create VQC config
        config = VQCConfig(
            feature_map=feature_map,
            variational_layer=variational_layer,
            measurement_layer=measurement_layer,
            max_iterations=max_iterations
        )

        # Create and train VQC
        vqc = VariationalQuantumClassifier(config)

        # Convert training data to expected format
        train_samples = [(x, y) for x, y in zip(training_data, labels)]

        # Train the model
        training_result = vqc.train(train_samples, labels, max_iterations)

        return {
            "success": True,
            "model": {
                "type": "VQC",
                "featureMap": feature_map.name,
                "numQubits": num_qubits,
                "numParameters": variational_layer.num_parameters
            },
            "training": training_result,
            "parameters": vqc.parameters
        }

    except Exception as e:
        container.logger().error("vqc_training_error", error=str(e))
        raise QuantumAPIError(f"Failed to train VQC: {str(e)}", status_code=500, error_code="ML_VQC_TRAINING_ERROR")

@app.post("/api/quantum-ml/vqc/predict")
async def predict_vqc(data: Dict[str, Any]):
    """Make predictions with a trained VQC"""
    try:
        parameters = data.get("parameters", [])
        feature_map_type = data.get("featureMap", "z")
        num_qubits = data.get("numQubits", 2)
        input_data = data.get("inputData", [])

        # Recreate model configuration
        if feature_map_type.lower() == "z":
            feature_map = ZFeatureMap(num_qubits)
        else:
            feature_map = ZFeatureMap(num_qubits)

        variational_layer = VariationalLayer(num_qubits)
        measurement_layer = MeasurementLayer(num_qubits)

        config = VQCConfig(
            feature_map=feature_map,
            variational_layer=variational_layer,
            measurement_layer=measurement_layer
        )

        # Create model and set parameters
        vqc = VariationalQuantumClassifier(config)
        vqc.parameters = parameters

        # Make prediction
        prediction = vqc.predict(input_data)

        return {
            "success": True,
            "prediction": prediction
        }

    except Exception as e:
        container.logger().error("vqc_prediction_error", error=str(e))
        raise QuantumAPIError(f"Failed to make VQC prediction: {str(e)}", status_code=500, error_code="ML_VQC_PREDICTION_ERROR")

# ============================================================================
# ASYNCHRONOUS QUANTUM EXECUTION ENDPOINTS
# ============================================================================

# Asynchronous Circuit Execution
@app.post("/api/quantum/async/execute")
async def execute_circuit_async(data: Dict[str, Any]):
    """Execute quantum circuit asynchronously using worker"""
    try:
        circuit = data.get("circuit")
        initial_state = data.get("initialState", "ket0")
        task_id = data.get("taskId", f"task_{int(time.time() * 1000)}")

        if not circuit:
            raise HTTPException(status_code=400, detail="Circuit is required")

        # Create worker and execute asynchronously
        async with QuantumWorker() as worker:
            message = {
                "type": "simulate",
                "id": task_id,
                "data": {
                    "circuit": circuit,
                    "initialState": initial_state
                }
            }

            # Execute asynchronously
            response = await worker.execute(message)

            if response.type == "error":
                raise HTTPException(status_code=500, detail=response.error)

            return {
                "success": True,
                "taskId": task_id,
                "result": response.data,
                "status": "completed"
            }

    except (HTTPException, QuantumAPIError):
        raise
    except Exception as e:
        container.logger().error("async_execution_error", error=str(e))
        raise WorkerPoolError(f"Failed to execute circuit asynchronously: {str(e)}")


# Reduced states endpoint
@app.post("/api/reduced")
async def compute_reduced(data: Dict[str, Any]):
    """
    Compute reduced density matrices for the given code.
    Accepts: { code: string }
    Returns: { circuit: object, reducedStates: array }
    """
    try:
        code = data.get("code", "")
        if not code:
            raise HTTPException(status_code=400, detail="Code is required")

        # Parse the code into a circuit object
        from quantum_code_parser import parse_quantum_code
        from quantum_simulation import simulate_circuit as simulate_circuit_py

        circuit_obj = parse_quantum_code(code)
        
        # Simulate locally (Python density matrix simulator)
        result = simulate_circuit_py(circuit_obj)
        
        # Serialize for frontend
        reduced_states = []
        if result.reducedStates:
            reduced_states = [
                {
                    "matrix": state.matrix,
                    "blochVector": state.blochVector,
                    "purity": state.purity,
                    "entanglement": state.entanglement,
                    "superposition": state.superposition
                }
                for state in result.reducedStates
            ]

        # Convert Simulation circuit to frontend format
        frontend_circuit = {
            "numQubits": circuit_obj.num_qubits,
            "gates": [
                {
                    "name": g.name,
                    "qubits": g.qubits,
                    "parameters": g.parameters
                }
                for g in circuit_obj.gates
            ]
        }

        return {
            "success": True,
            "circuit": frontend_circuit,
            "reducedStates": reduced_states
        }

    except Exception as e:
        container.logger().error("reduced_state_error", error=str(e))
        raise CircuitExecutionError(f"Failed to compute reduced states: {str(e)}")

# Worker Pool Status
@app.get("/api/quantum/workers/status")
async def get_worker_status():
    """Get comprehensive status of quantum worker pool"""
    try:
        from quantum_worker import QuantumWorkerPool
        from container import container
        
        # Get worker pool instance
        pool_instance = container.worker_pool()
        
        # Get pool status
        pool_status = pool_instance.get_pool_status() if hasattr(pool_instance, 'get_pool_status') else {}
        
        return {
            "success": True,
            "pool": pool_status,
            "workers": {
                "active": pool_status.get("active_workers", 0),
                "total": pool_status.get("num_workers", 0),
                "healthy": pool_status.get("active_workers", 0)
            },
            "queue": {
                "pending": pool_status.get("queue_size", 0),
                "processing": sum(pool_status.get("worker_load", {}).values())
            },
            "statistics": {
                "tasks_completed": pool_status.get("total_tasks_completed", 0),
                "tasks_failed": pool_status.get("total_tasks_failed", 0),
                "success_rate": (
                    pool_status.get("total_tasks_completed", 0) / 
                    max(pool_status.get("total_tasks_completed", 0) + pool_status.get("total_tasks_failed", 0), 1) * 100
                )
            }
        }

    except Exception as e:
        container.logger().error("worker_status_error", error=str(e))
        raise WorkerPoolError(f"Failed to get worker status: {str(e)}")

# ============================================================================
# DATA PREPROCESSING ENDPOINTS
# ============================================================================

# Data Preprocessing
@app.post("/api/quantum-ml/preprocessing")
async def preprocess_data(data: Dict[str, Any]):
    """Apply quantum data preprocessing"""
    try:
        raw_data = data.get("data", [])
        config = data.get("config", {})

        # Convert to DataSample format
        samples = [
            DataSample(
                features=point.get("features", []),
                label=point.get("label"),
                target=point.get("target")
            )
            for point in raw_data
        ]

        # Create preprocessor
        preprocessor = QuantumDataPreprocessor(config)

        # Fit and transform
        processed_samples = preprocessor.fit_transform(samples)

        # Convert back to dict format
        processed_data = [
            {
                "features": sample.features,
                "label": sample.label,
                "target": sample.target,
                "metadata": sample.metadata
            }
            for sample in processed_samples
        ]

        return {
            "success": True,
            "processedData": processed_data,
            "statistics": preprocessor.get_statistics(),
            "config": preprocessor.export_config()
        }

    except Exception as e:
        container.logger().error("data_preprocessing_error", error=str(e))
        raise QuantumAPIError(f"Failed to preprocess data: {str(e)}", status_code=500, error_code="ML_PREPROCESSING_ERROR")

# Generate Synthetic Datasets
@app.post("/api/quantum-ml/datasets/generate")
async def generate_dataset(data: Dict[str, Any]):
    """Generate synthetic quantum ML datasets"""
    try:
        dataset_type = data.get("type", "classification")
        subtype = data.get("subtype", "circles")
        num_samples = data.get("numSamples", 100)

        if dataset_type == "classification":
            features, labels = generate_classification_dataset(subtype, num_samples)
        elif dataset_type == "regression":
            features, labels = generate_regression_dataset(subtype, num_samples)
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported dataset type: {dataset_type}")

        # Convert to expected format
        dataset = [
            {
                "features": feat,
                "label": int(label) if isinstance(label, (int, float)) and dataset_type == "classification" else label,
                "target": label if dataset_type == "regression" else None
            }
            for feat, label in zip(features, labels)
        ]

        return {
            "success": True,
            "dataset": dataset,
            "type": dataset_type,
            "subtype": subtype,
            "numSamples": num_samples
        }

    except (HTTPException, QuantumAPIError):
        raise
    except Exception as e:
        container.logger().error("dataset_generation_error", error=str(e))
        raise QuantumAPIError(f"Failed to generate dataset: {str(e)}", status_code=500, error_code="ML_DATASET_ERROR")

# Analyze Quantum Readiness
@app.post("/api/quantum-ml/analysis/quantum-readiness")
async def analyze_quantum_readiness_endpoint(data: Dict[str, Any]):
    """Analyze data for quantum ML compatibility"""
    try:
        raw_data = data.get("data", [])

        # Convert to DataSample format
        samples = [
            DataSample(
                features=point.get("features", []),
                label=point.get("label")
            )
            for point in raw_data
        ]

        # Analyze quantum readiness
        analysis = analyze_quantum_readiness(samples)

        return {
            "success": True,
            "analysis": analysis
        }

    except Exception as e:
        container.logger().error("quantum_readiness_error", error=str(e))
        raise QuantumAPIError(f"Failed to analyze quantum readiness: {str(e)}", status_code=500, error_code="ML_ANALYSIS_ERROR")

# Model Evaluation
@app.post("/api/quantum-ml/evaluation")
async def evaluate_model(data: Dict[str, Any]):
    """Evaluate quantum ML model performance"""
    try:
        predictions = data.get("predictions", [])
        true_labels = data.get("trueLabels", [])
        targets = data.get("targets", [])
        evaluation_type = data.get("type", "classification")

        if evaluation_type == "classification":
            metrics = evaluate_classification(predictions, true_labels)
        elif evaluation_type == "regression":
            metrics = evaluate_regression(predictions, targets)
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported evaluation type: {evaluation_type}")

        return {
            "success": True,
            "metrics": {
                "accuracy": metrics.accuracy,
                "precision": metrics.precision,
                "recall": metrics.recall,
                "f1Score": metrics.f1_score,
                "mse": metrics.mse,
                "mae": metrics.mae
            }
        }

    except (HTTPException, QuantumAPIError):
        raise
    except Exception as e:
        container.logger().error("model_evaluation_error", error=str(e))
        raise QuantumAPIError(f"Failed to evaluate model: {str(e)}", status_code=500, error_code="ML_EVALUATION_ERROR")

# Helper functions
async def get_backend_info(token: str, backend_id: str) -> Dict[str, Any]:
    """Get backend information from IBM Quantum"""
    try:
        import aiohttp
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"https://api.quantum.ibm.com/runtime/backends/{backend_id}",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json"
                },
                timeout=aiohttp.ClientTimeout(total=10)
            ) as response:
                if response.status >= 400:
                    raise Exception(f"Backend info request failed: {response.status}")

                backend = await response.json()
                return {
                    "id": backend_id,
                    "name": backend.get("name", backend_id),
                    "status": backend.get("status", "available"),
                    "qubits": backend.get("n_qubits", backend.get("num_qubits", 0)),
                    "type": "simulator" if backend.get("simulator") else "hardware"
                }
    except Exception as e:
        print(f"Backend info error: {e}")

        # Return default info for common backends
        default_backends = {
            "ibmq_qasm_simulator": {"name": "IBM QASM Simulator", "qubits": 32, "type": "simulator"},
            "simulator_statevector": {"name": "Statevector Simulator", "qubits": 24, "type": "simulator"},
            "simulator_mps": {"name": "Matrix Product State Simulator", "qubits": 100, "type": "simulator"},
            "ibmq_manila": {"name": "IBM Manila", "qubits": 5, "type": "hardware"},
            "ibmq_lima": {"name": "IBM Lima", "qubits": 5, "type": "hardware"},
            "ibmq_belem": {"name": "IBM Belem", "qubits": 5, "type": "hardware"},
            "ibmq_quito": {"name": "IBM Quito", "qubits": 5, "type": "hardware"},
            "ibm_brisbane": {"name": "IBM Brisbane", "qubits": 127, "type": "hardware"},
            "ibm_sherbrooke": {"name": "IBM Sherbrooke", "qubits": 127, "type": "hardware"}
        }

        return {
            "id": backend_id,
            "name": default_backends.get(backend_id, {}).get("name", backend_id),
            "status": "available",
            "qubits": default_backends.get(backend_id, {}).get("qubits", 0),
            "type": default_backends.get(backend_id, {}).get("type", "simulator")
        }

async def get_available_backends(token: Optional[str] = None) -> tuple[List[Dict[str, Any]], bool]:
    """Get available backends from IBM Quantum"""
    try:
        effective_token = token if token is not None else os.getenv("IBM_QUANTUM_TOKEN")

        import aiohttp
        async with aiohttp.ClientSession() as session:
            async with session.get(
                "https://api.quantum.ibm.com/runtime/backends",
                headers={
                    "Authorization": f"Bearer {effective_token}",
                    "Content-Type": "application/json"
                },
                timeout=aiohttp.ClientTimeout(total=5)
            ) as response:
                if response.status >= 400:
                    raise Exception(f"Backend listing failed: {response.status}")

                backends_data = await response.json()
                backends = [
                    {
                        "id": backend.get("name", backend.get("id", "")),
                        "name": backend.get("name", backend.get("id", "")),
                        "status": backend.get("status", "available"),
                        "qubits": backend.get("n_qubits", backend.get("num_qubits", 0)),
                        "type": "simulator" if backend.get("simulator") else "hardware"
                    }
                    for backend in backends_data
                ]
                return backends, False

    except Exception as e:
        print(f"Backend listing error: {e}")

        # Return default backends
        default_backends = [
            {"id": "ibmq_qasm_simulator", "name": "IBM QASM Simulator", "status": "available", "qubits": 32, "type": "simulator"},
            {"id": "simulator_statevector", "name": "Statevector Simulator", "status": "available", "qubits": 24, "type": "simulator"},
            {"id": "simulator_mps", "name": "Matrix Product State Simulator", "status": "available", "qubits": 100, "type": "simulator"},
            {"id": "ibmq_manila", "name": "IBM Manila", "status": "available", "qubits": 5, "type": "hardware"},
            {"id": "ibmq_lima", "name": "IBM Lima", "status": "available", "qubits": 5, "type": "hardware"},
            {"id": "ibmq_belem", "name": "IBM Belem", "status": "available", "qubits": 5, "type": "hardware"},
            {"id": "ibmq_quito", "name": "IBM Quito", "status": "available", "qubits": 5, "type": "hardware"},
            {"id": "ibm_brisbane", "name": "IBM Brisbane", "status": "available", "qubits": 127, "type": "hardware"},
            {"id": "ibm_sherbrooke", "name": "IBM Sherbrooke", "status": "available", "qubits": 127, "type": "hardware"}
        ]
        return default_backends, True

async def get_ibm_job_status(token: str, job_id: str) -> Dict[str, Any]:
    """Get IBM Quantum job status"""
    try:
        import aiohttp
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"https://api.quantum.ibm.com/runtime/jobs/{job_id}",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json"
                },
                timeout=aiohttp.ClientTimeout(total=10)
            ) as response:
                if response.status == 404:
                    return {
                        "jobId": job_id,
                        "status": "COMPLETED",
                        "statusMessage": "Job completed successfully",
                        "progress": 100,
                        "estimatedTime": None,
                        "results": None
                    }
                elif response.status >= 400:
                    raise Exception(f"Job status request failed: {response.status}")

                job = await response.json()
                return {
                    "jobId": job.get("id", job_id),
                    "status": map_runtime_status(job.get("status", "RUNNING")),
                    "statusMessage": get_status_message(job.get("status", "RUNNING")),
                    "progress": job.get("progress", 100 if job.get("status") == "COMPLETED" else 50),
                    "estimatedTime": job.get("estimated_time"),
                    "results": job.get("results")
                }

    except Exception as e:
        print(f"Job status error: {e}")

        return {
            "jobId": job_id,
            "status": "RUNNING",
            "statusMessage": "Job is running on IBM Quantum hardware",
            "progress": 50,
            "estimatedTime": None,
            "results": None
        }

async def get_ibm_job_result(token: str, job_id: str) -> Dict[str, Any]:
    """Get IBM Quantum job result"""
    try:
        import aiohttp
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"https://api.quantum.ibm.com/runtime/jobs/{job_id}/results",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json"
                },
                timeout=aiohttp.ClientTimeout(total=10)
            ) as response:
                if response.status >= 400:
                    raise Exception(f"Job result request failed: {response.status}")

                return {
                    "jobId": job_id,
                    "results": await response.json(),
                    "executionTime": 0,  # Not available in Runtime API
                    "backend": "unknown"
                }

    except Exception as e:
        print(f"Job result error: {e}")

        return {
            "jobId": job_id,
            "results": None,
            "executionTime": 0,
            "backend": "unknown",
            "error": "Results not available through Runtime API"
        }

async def get_ibm_user_jobs(token: str) -> List[Dict[str, Any]]:
    """Get IBM Quantum user jobs"""
    try:
        import aiohttp
        async with aiohttp.ClientSession() as session:
            async with session.get(
                "https://api.quantum.ibm.com/runtime/jobs",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json"
                },
                timeout=aiohttp.ClientTimeout(total=10)
            ) as response:
                if response.status >= 400:
                    raise Exception(f"User jobs request failed: {response.status}")

                jobs_data = await response.json()
                return [
                    {
                        "jobId": job.get("id", job.get("job_id", "")),
                        "status": map_runtime_status(job.get("status", "RUNNING")),
                        "backend": job.get("backend", "unknown"),
                        "createdAt": job.get("created_at", datetime.utcnow().isoformat()),
                        "completedAt": job.get("completed_at"),
                        "progress": job.get("progress", 100 if job.get("status") == "COMPLETED" else 50)
                    }
                    for job in jobs_data
                ]

    except Exception as e:
        print(f"User jobs error: {e}")
        return []

def map_runtime_status(runtime_status: str) -> str:
    """Map Runtime API status to our format"""
    status_map = {
        "COMPLETED": "COMPLETED",
        "FAILED": "FAILED",
        "CANCELLED": "CANCELLED",
        "RUNNING": "RUNNING",
        "QUEUED": "QUEUED",
        "PENDING": "QUEUED",
        "DONE": "COMPLETED",
        "ERROR": "FAILED"
    }
    return status_map.get(runtime_status, "RUNNING")

def get_status_message(status: str) -> str:
    """Get status message for a given status"""
    messages = {
        "CREATED": "Job created and queued",
        "QUEUED": "Job is queued for execution",
        "RUNNING": "Job is currently running",
        "COMPLETED": "Job completed successfully",
        "FAILED": "Job failed to execute",
        "CANCELLED": "Job was cancelled",
        "ERROR": "Job encountered an error",
        "PENDING": "Job is pending execution",
        "IN_PROGRESS": "Job is in progress",
        "DONE": "Job completed successfully",
        "INITIALIZING": "Job is initializing",
        "VALIDATING": "Job is being validated",
        "QUEUED_REMOTE": "Job queued on remote backend",
        "RUNNING_REMOTE": "Job running on remote backend",
        "COMPLETED_REMOTE": "Job completed on remote backend"
    }
    return messages.get(status, "Job status unknown")

# ============================================================================
# Enhanced Error Handling Setup
# ============================================================================

# Setup enhanced error handling and logging
setup_enhanced_error_handling(app)

# Import legacy error handlers for backward compatibility
from error_handling import (
    QuantumAPIError as LegacyQuantumAPIError,
    QuantumValidationError,
    CircuitExecutionError as LegacyCircuitExecutionError,
    IBMQuantumError as LegacyIBMQuantumError,
    CacheError,
    WorkerPoolError
)

# ---------------------------------------------------------------------------
# Quantum Medical Core Endpoints
# ---------------------------------------------------------------------------
@app.post("/api/medical/save-training")
async def save_training_data(data: Dict[str, Any], session: AsyncSession = Depends(get_session)):
    """Save manually uploaded training records to DB"""
    try:
        records = data.get("records", [])
        if not records:
             raise HTTPException(status_code=400, detail="records are required")
        
        from medical_core import medical_core
        import pandas as pd
        
        df = pd.DataFrame(records)
        medical_core.train(df)
        await medical_core.save_to_db(session, origin="Manual Upload")
        
        return {
            "success": True,
            "message": f"Saved {len(records)} records to database"
        }
    except Exception as e:
        container.logger().error("medical_save_error", error=str(e))
        raise QuantumAPIError(f"Failed to save training data: {str(e)}", status_code=400, error_code="MEDICAL_SAVE_ERROR")

@app.post("/api/medical/load-drive")
async def load_drive_dataset(data: Dict[str, Any], session: AsyncSession = Depends(get_session)):
    """Load dataset from a public Google Drive link and save to DB"""
    try:
        url = data.get("url")
        if not url:
            raise HTTPException(status_code=400, detail="URL is required")
        
        # Download and parse
        df = download_csv_from_drive(url)
        
        # Train model
        result = medical_core.train(df)
        
        # Save to database
        await medical_core.save_to_db(session, origin=url)
        
        return {
            "success": True,
            "message": f"Successfully loaded {result['sample_count']} records and saved to database",
            "features": result['features'],
            "classes": result['classes']
        }
    except Exception as e:
        container.logger().error("medical_drive_load_error", error=str(e))
        raise QuantumAPIError(f"Failed to load medical dataset: {str(e)}", status_code=400, error_code="MEDICAL_LOAD_ERROR")

@app.post("/api/medical/analyze")
async def analyze_patient(data: Dict[str, Any]):
    """Analyze new patient data against loaded dataset"""
    try:
        patient_data = data.get("patientData")
        if not patient_data:
            raise HTTPException(status_code=400, detail="patientData is required")
        
        result = medical_core.predict(patient_data)
        
        return {
            "success": True,
            "result": result
        }
    except Exception as e:
        container.logger().error("medical_analysis_error", error=str(e))
        raise QuantumAPIError(f"Failed to analyze patient data: {str(e)}", status_code=400, error_code="MEDICAL_ANALYSIS_ERROR")

@app.get("/api/medical/status")
async def get_medical_status(session: AsyncSession = Depends(get_session)):
    """Check if medical model is trained"""
    # Just in case it's not loaded yet, try one more time directly
    if medical_core.dataset is None:
        try:
             await medical_core.load_from_db(session)
        except:
             pass

    from dataset_manager import dataset_manager
    current_dataset_info = dataset_manager.get_current_dataset_info()

    return {
        "isTrained": medical_core.dataset is not None,
        "sampleCount": len(medical_core.dataset) if medical_core.dataset is not None else 0,
        "classes": medical_core.dataset[medical_core.target].unique().tolist() if medical_core.dataset is not None else [],
        "currentDataset": current_dataset_info,
        "selectedFeatures": medical_core.selected_features,
        "currentDatasetName": medical_core.current_dataset_name
    }

@app.get("/api/medical/datasets")
async def list_datasets():
    """List all available datasets"""
    from dataset_manager import dataset_manager
    return {
        "success": True,
        "datasets": dataset_manager.list_datasets()
    }

@app.post("/api/medical/switch-dataset")
async def switch_dataset(data: dict, session: AsyncSession = Depends(get_session)):
    """Switch to a different dataset and retrain"""
    try:
        dataset_name = data.get("datasetName")
        if not dataset_name:
            raise HTTPException(status_code=400, detail="datasetName is required")
        
        from medical_core import switch_and_train_dataset
        
        # Switch and retrain
        result = switch_and_train_dataset(dataset_name)
        
        if result.get("status") == "Failed":
            raise HTTPException(status_code=404, detail=result.get("error"))
        
        # Save to DB
        try:
            await medical_core.save_to_db(session, origin=f"Dataset: {dataset_name}")
        except:
            pass
        
        return {
            "success": True,
            "message": f"Switched to dataset: {dataset_name}",
            "trainingResult": result
        }
    except HTTPException:
        raise
    except Exception as e:
        container.logger().error("dataset_switch_error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))




# ============================================================================
# Symptom Analysis Endpoints
# ============================================================================

class SymptomPredictRequest(BaseModel):
    symptoms: List[str]

@app.post("/api/symptoms/train")
async def train_symptom_model():
    """Trigger training of the symptom analysis model"""
    try:
        container.logger().info("symptom_training_started")
        result = symptom_analyzer.train()
        return result
    except Exception as e:
        container.logger().error("symptom_training_failed", error=str(e))
        return {"success": False, "error": str(e)}

@app.post("/api/symptoms/predict")
async def predict_symptoms(request: SymptomPredictRequest):
    """Predict condition based on symptoms"""
    try:
        container.logger().info("symptom_prediction_requested", symptoms=len(request.symptoms))
        result = symptom_analyzer.predict(request.symptoms)
        return result
    except Exception as e:
        container.logger().error("symptom_prediction_failed", error=str(e))
        return {"success": False, "error": str(e)}

@app.get("/api/symptoms/list")
async def get_symptom_list():
    """Get list of available symptoms for the frontend"""
    try:
        symptoms = symptom_analyzer.get_symptoms()
        # Sort for better UI
        symptoms.sort()
        return {"success": True, "symptoms": symptoms}
    except Exception as e:
        container.logger().error("symptom_list_failed", error=str(e))
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    import uvicorn
    port = 3005 # Match frontend configuration
    print(f"Quantum Backend API running on port {port}")
    print(f"Health check: http://localhost:{port}/health")
    print(f"CORS enabled for: {os.getenv('FRONTEND_URL', 'http://localhost:5173')}")
    uvicorn.run(app, host="0.0.0.0", port=port)
