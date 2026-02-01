from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from datetime import datetime
from typing import List, Dict, Any

from database import get_session
from db_models import GamificationProfile
from container import container

router = APIRouter(
    prefix="/gamification",
    tags=["gamification"]
)

@router.get("/profile/{userId}")
async def get_profile(userId: str, session: AsyncSession = Depends(get_session)):
    try:
        result = await session.execute(select(GamificationProfile).where(GamificationProfile.user_id == userId))
        profile = result.scalars().first()
        
        if not profile:
            # Create new profile if not exists
            profile = GamificationProfile(user_id=userId)
            session.add(profile)
            await session.commit()
            await session.refresh(profile)
            
        return profile.to_dict()
    except Exception as e:
        container.logger().error("get_profile_failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/profile/{userId}/progress")
async def update_progress(
    userId: str, 
    data: Dict[str, Any] = Body(...),
    session: AsyncSession = Depends(get_session)
):
    try:
        result = await session.execute(select(GamificationProfile).where(GamificationProfile.user_id == userId))
        profile = result.scalars().first()
        
        if not profile:
            profile = GamificationProfile(user_id=userId)
            session.add(profile)
        
        # Update fields
        if "experience" in data:
            profile.experience += data["experience"]
        if "level" in data:
            profile.level = data["level"]
        if "currentStreak" in data:
            profile.current_streak = data["currentStreak"]
        if "studyTime" in data:
            profile.total_study_time += data["studyTime"]
        if "completedChallenge" in data:
            # SQLAlchemy JSON handling needs careful list updating
            current_challenges = list(profile.completed_challenges) if profile.completed_challenges else []
            if data["completedChallenge"] not in current_challenges:
                current_challenges.append(data["completedChallenge"])
                profile.completed_challenges = current_challenges
                
        profile.last_activity = datetime.utcnow()
        
        await session.commit()
        await session.refresh(profile)
        return profile.to_dict()
    except Exception as e:
        await session.rollback()
        container.logger().error("update_progress_failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/leaderboard")
async def get_leaderboard(session: AsyncSession = Depends(get_session)):
    try:
        result = await session.execute(
            select(GamificationProfile).order_by(desc(GamificationProfile.experience)).limit(10)
        )
        profiles = result.scalars().all()
        
        leaderboard_data = []
        for i, p in enumerate(profiles):
            data = p.to_dict()
            data["rank"] = i + 1
            # Simplified username generation
            data["username"] = f"User {p.user_id[-4:]}" if len(p.user_id) > 4 else f"User {p.user_id}"
            leaderboard_data.append(data)
            
        return leaderboard_data
    except Exception as e:
        container.logger().error("get_leaderboard_failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))
