from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, Boolean
from datetime import datetime
from database import Base

class MedicalCaseRecord(Base):
    __tablename__ = "medical_cases"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String, index=True)
    age = Column(Integer)
    gender = Column(String)
    scan_type = Column(String)
    region = Column(String)
    scan_date = Column(DateTime, default=datetime.utcnow)
    diagnosis = Column(String)
    status = Column(String) # 'Training Data', 'Analyzed'
    confidence = Column(Float, nullable=True)
    quantum_entropy = Column(Float, nullable=True)
    dataset_origin = Column(String)
    features_json = Column(JSON, nullable=True) # Store raw features for comparison

    def to_dict(self):
        return {
            "id": f"DB-{self.id}",
            "patientId": self.patient_id,
            "age": self.age,
            "gender": self.gender,
            "scanType": self.scan_type,
            "region": self.region,
            "scanDate": self.scan_date.isoformat() if self.scan_date else None,
            "diagnosis": self.diagnosis,
            "status": self.status,
            "confidence": self.confidence,
            "quantumEntropy": self.quantum_entropy,
            "datasetOrigin": self.dataset_origin,
            "features": self.features_json
        }


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
