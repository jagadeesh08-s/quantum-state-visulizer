from fastapi import APIRouter, HTTPException
from datetime import datetime
from models import VisionAnalysisRequest, VisionAnalysisResponse
from gemini_service import gemini_service
from container import container

router = APIRouter(
    prefix="/vision",
    tags=["vision"]
)

@router.post("/analyze-image", response_model=VisionAnalysisResponse)
async def analyze_screen_image(request: VisionAnalysisRequest):
    """
    Analyze a base64 encoded screen capture using Gemini Vision AI
    """
    try:
        if not gemini_service.is_configured():
            raise HTTPException(status_code=503, detail="Gemini AI service is not configured")
            
        description = await gemini_service.analyze_image(request.image, request.prompt)
        
        return VisionAnalysisResponse(
            success=True,
            description=description,
            timestamp=datetime.utcnow().isoformat()
        )
    except Exception as e:
        container.logger().error("vision_analysis_failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))
