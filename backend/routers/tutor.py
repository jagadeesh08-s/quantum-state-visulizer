from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import random

from models import AIQuestionRequest, AIQuestionResponse
from watsonx_service import watsonx_service
from gemini_service import gemini_service
from container import container

router = APIRouter(
    prefix="/tutor",
    tags=["tutor"]
)

@router.post("/chat", response_model=AIQuestionResponse)
async def chat_tutor(request: AIQuestionRequest):
    try:
        from quantum_knowledge_base import ask_ai_question
        answer = await ask_ai_question(request.question)
             
        return AIQuestionResponse(
             success=True,
             question=request.question,
             answer=answer,
             timestamp=datetime.utcnow().isoformat()
        )

    except Exception as e:
        container.logger().error("tutor_chat_failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))
