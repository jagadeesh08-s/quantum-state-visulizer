from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, Boolean
from datetime import datetime
from database import Base

class AnalyticsEvent(Base):
    __tablename__ = "analytics_events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True)
    session_id = Column(String, index=True)
    action = Column(String)
    category = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)
    duration = Column(Float, nullable=True)
    success = Column(Boolean, default=True)
    metadata_json = Column(JSON, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "userId": self.user_id,
            "sessionId": self.session_id,
            "action": self.action,
            "category": self.category,
            "timestamp": self.timestamp.isoformat(),
            "duration": self.duration,
            "success": self.success,
            "metadata": self.metadata_json
        }


class GamificationProfile(Base):
    __tablename__ = "gamification_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, unique=True, index=True)
    experience = Column(Integer, default=0)
    level = Column(Integer, default=1)
    current_streak = Column(Integer, default=0)
    total_study_time = Column(Integer, default=0)  # in minutes
    completed_challenges = Column(JSON, default=list)  # List of challenge IDs
    achievements = Column(JSON, default=list)  # List of achievement IDs
    last_activity = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "userId": self.user_id,
            "experience": self.experience,
            "level": self.level,
            "currentStreak": self.current_streak,
            "totalStudyTime": self.total_study_time,
            "completedChallenges": self.completed_challenges,
            "achievements": self.achievements,
            "lastActivity": self.last_activity.isoformat()
        }
