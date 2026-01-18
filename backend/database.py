"""
Database connection and session management
"""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy.pool import NullPool, QueuePool
from config import config
from container import container

# Create base class for models
Base = declarative_base()

# Database engine
_engine = None
_session_factory = None


def get_database_url() -> str:
    """Get database URL, converting to async format if needed"""
    db_url = config.database.url
    
    # Convert sqlite:// to sqlite+aiosqlite:// for async
    if db_url.startswith("sqlite:///"):
        db_url = db_url.replace("sqlite:///", "sqlite+aiosqlite:///")
    # Convert postgresql:// to postgresql+asyncpg:// for async
    elif db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://")
    # Convert mysql:// to mysql+aiomysql:// for async
    elif db_url.startswith("mysql://"):
        db_url = db_url.replace("mysql://", "mysql+aiomysql://")
    
    return db_url


def init_database():
    """Initialize database engine and session factory"""
    global _engine, _session_factory
    
    if _engine is not None:
        return
    
    db_url = get_database_url()
    
    # Use NullPool for SQLite, QueuePool for others
    poolclass = NullPool if "sqlite" in db_url else QueuePool
    
    # Engine arguments
    engine_args = {
        "echo": config.database.echo,
        "future": True
    }
    
    # Only add pool arguments if not using NullPool
    if poolclass is not NullPool:
        engine_args["poolclass"] = poolclass
        engine_args["pool_size"] = config.database.pool_size
        engine_args["max_overflow"] = config.database.max_overflow
        engine_args["pool_timeout"] = config.database.pool_timeout
    else:
        engine_args["poolclass"] = NullPool

    _engine = create_async_engine(db_url, **engine_args)
    
    _session_factory = async_sessionmaker(
        _engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False
    )
    
    container.logger().info("database_initialized", url=db_url.split("@")[-1] if "@" in db_url else db_url)


async def get_session() -> AsyncSession:
    """Get database session"""
    if _session_factory is None:
        init_database()
    
    async with _session_factory() as session:
        try:
            yield session
        finally:
            await session.close()


async def create_tables():
    """Create all database tables"""
    if _engine is None:
        init_database()
    
    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    container.logger().info("database_tables_created")


async def drop_tables():
    """Drop all database tables (use with caution!)"""
    if _engine is None:
        init_database()
    
    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    
    container.logger().warning("database_tables_dropped")


async def close_database():
    """Close database connections"""
    global _engine, _session_factory
    
    if _engine:
        await _engine.dispose()
        _engine = None
        _session_factory = None
        container.logger().info("database_connections_closed")
