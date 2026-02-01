from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

from database import get_session
from db_models import AnalyticsEvent
from container import container

router = APIRouter(
    prefix="/analytics",
    tags=["analytics"]
)

class AnalyticsEventCreate(BaseModel):
    userId: str
    sessionId: str
    action: str
    category: str
    duration: Optional[float] = None
    success: bool = True
    metadata: Optional[Dict[str, Any]] = None

@router.post("/events")
async def track_event(
    event: AnalyticsEventCreate,
    session: AsyncSession = Depends(get_session)
):
    try:
        db_event = AnalyticsEvent(
            user_id=event.userId,
            session_id=event.sessionId,
            action=event.action,
            category=event.category,
            duration=event.duration,
            success=event.success,
            metadata_json=event.metadata
        )
        session.add(db_event)
        await session.commit()
        return {"success": True, "id": db_event.id}
    except Exception as e:
        await session.rollback()
        container.logger().error("track_event_failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/dashboard")
async def get_dashboard_data(
    timeRange: str = Query("30d", enum=["7d", "30d", "90d", "1y"]),
    session: AsyncSession = Depends(get_session)
):
    # Calculate start date
    days = 30
    if timeRange == "7d": days = 7
    elif timeRange == "90d": days = 90
    elif timeRange == "1y": days = 365
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    try:
        # Fetch events
        result = await session.execute(
            select(AnalyticsEvent).where(AnalyticsEvent.timestamp >= start_date)
        )
        events = result.scalars().all()
        
        # Calculate metrics (similar to frontend logic but on server)
        total_events = len(events)
        unique_users = len(set(e.user_id for e in events))
        
        # Simple simulation of system metrics for now
        system_metrics = {
            "cpuUsage": 45.5,
            "memoryUsage": 62.1,
            "uptime": 99.9,
            "networkLatency": 24, # Added missing field
            "cacheHitRate": 88.5, # Added missing field
            "quantumJobsProcessed": len([e for e in events if e.action == 'simulation']),
            "averageJobTime": 2.4
        }
        
        learning_metrics = {
            "totalLearners": len(set(e.user_id for e in events if e.category == 'tutorial')),
            "completedTutorials": len([e for e in events if e.action == 'tutorial_complete']),
            "averageProgress": 45, # Placeholder
            "popularTopics": [], # Placeholder
            "skillDistribution": [], # Placeholder
            "assessmentScores": [] # Placeholder
        }

        # Popular features
        action_counts = {}
        for e in events:
            if e.category not in action_counts: action_counts[e.category] = 0
            action_counts[e.category] += 1
            
        popular_features = [{"name": k, "usage": v} for k, v in sorted(action_counts.items(), key=lambda item: item[1], reverse=True)[:5]]

        return {
            "totalUsers": unique_users,
            "activeUsers": unique_users, # Simplified
            "totalSessions": len(set(e.session_id for e in events)),
            "averageSessionTime": 15.5, # Placeholder
            "popularFeatures": popular_features,
            "errorRate": (len([e for e in events if not e.success]) / total_events * 100) if total_events > 0 else 0,
            "completionRate": 75.0,
            "userRetention": 60.0,
            "systemMetrics": system_metrics,
            "learningMetrics": learning_metrics
        }
    except Exception as e:
        container.logger().error("dashboard_data_failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))
