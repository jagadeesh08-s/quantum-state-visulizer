"""
Centralized configuration management for Quantum Backend API
"""
import os
from typing import List, Optional
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class DatabaseConfig:
    """Database configuration"""
    url: str = "sqlite:///./quantum.db"
    pool_size: int = 10
    max_overflow: int = 20
    pool_timeout: int = 30
    echo: bool = False


@dataclass
class RedisConfig:
    """Redis cache configuration"""
    url: str = "redis://localhost:6379"
    db: int = 0
    ttl: int = 3600  # 1 hour default TTL
    max_connections: int = 20


@dataclass
class IBMQuantumConfig:
    """IBM Quantum configuration"""
    token: Optional[str] = None
    timeout: int = 30
    max_retries: int = 3
    rate_limit: int = 10  # requests per minute


@dataclass
class MonitoringConfig:
    """Monitoring and metrics configuration"""
    prometheus_port: int = 9090
    enable_metrics: bool = True
    log_level: str = "INFO"


@dataclass
class QuantumConfig:
    """Quantum computing specific configuration"""
    max_qubits: int = 50
    max_gates: int = 1000
    max_shots: int = 10000
    default_shots: int = 1024
    worker_pool_size: int = 4
    circuit_cache_ttl: int = 1800  # 30 minutes


@dataclass
class APIConfig:
    """API server configuration"""
    host: str = "0.0.0.0"
    port: int = 3005
    cors_origins: List[str] = field(default_factory=lambda: [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:8080",
        "http://127.0.0.1:5173"
    ])
    rate_limit_requests: int = 100
    rate_limit_window: int = 60  # seconds
    trusted_hosts: Optional[List[str]] = None
    max_request_size: int = 10 * 1024 * 1024  # 10MB


@dataclass
class Config:
    """Main configuration class"""
    # Core components
    database: DatabaseConfig = field(default_factory=DatabaseConfig)
    redis: RedisConfig = field(default_factory=RedisConfig)
    ibm_quantum: IBMQuantumConfig = field(default_factory=IBMQuantumConfig)
    monitoring: MonitoringConfig = field(default_factory=MonitoringConfig)
    quantum: QuantumConfig = field(default_factory=QuantumConfig)
    api: APIConfig = field(default_factory=APIConfig)

    # Environment
    env: str = "development"
    debug: bool = False
    secret_key: str = "your-secret-key-change-in-production"

    # External services
    medical_dataset_url: Optional[str] = None
    kaggle_username: Optional[str] = None
    kaggle_key: Optional[str] = None

    @classmethod
    def from_env(cls) -> 'Config':
        """Load configuration from environment variables"""
        return cls(
            # Database
            database=DatabaseConfig(
                url=os.getenv("DATABASE_URL", "sqlite:///./quantum.db"),
                pool_size=int(os.getenv("DB_POOL_SIZE", "10")),
                echo=os.getenv("DB_ECHO", "false").lower() == "true"
            ),

            # Redis
            redis=RedisConfig(
                url=os.getenv("REDIS_URL", "redis://localhost:6379"),
                ttl=int(os.getenv("REDIS_TTL", "3600")),
                max_connections=int(os.getenv("REDIS_MAX_CONNECTIONS", "20"))
            ),

            # IBM Quantum
            ibm_quantum=IBMQuantumConfig(
                token=os.getenv("IBM_QUANTUM_TOKEN"),
                timeout=int(os.getenv("IBM_TIMEOUT", "30")),
                rate_limit=int(os.getenv("IBM_RATE_LIMIT", "10"))
            ),

            # Monitoring
            monitoring=MonitoringConfig(
                prometheus_port=int(os.getenv("PROMETHEUS_PORT", "9090")),
                enable_metrics=os.getenv("ENABLE_METRICS", "true").lower() == "true",
                log_level=os.getenv("LOG_LEVEL", "INFO")
            ),

            # Quantum
            quantum=QuantumConfig(
                max_qubits=int(os.getenv("MAX_QUBITS", "50")),
                max_gates=int(os.getenv("MAX_GATES", "1000")),
                max_shots=int(os.getenv("MAX_SHOTS", "10000")),
                worker_pool_size=int(os.getenv("WORKER_POOL_SIZE", "4"))
            ),

            # API
            api=APIConfig(
                host=os.getenv("HOST", "0.0.0.0"),
                port=int(os.getenv("PORT", "3005")),
                cors_origins=os.getenv("CORS_ORIGINS", "*").split(","),
                rate_limit_requests=int(os.getenv("RATE_LIMIT_REQUESTS", "100"))
            ),

            # Environment
            env=os.getenv("ENV", "development"),
            debug=os.getenv("DEBUG", "false").lower() == "true",
            secret_key=os.getenv("SECRET_KEY", "your-secret-key-change-in-production"),

            # External services
            medical_dataset_url=os.getenv("MEDICAL_DATASET_URL"),
            kaggle_username=os.getenv("KAGGLE_USERNAME"),
            kaggle_key=os.getenv("KAGGLE_KEY")
        )

    def is_development(self) -> bool:
        """Check if running in development mode"""
        return self.env == "development"

    def is_production(self) -> bool:
        """Check if running in production mode"""
        return self.env == "production"


# Global configuration instance
config = Config.from_env()