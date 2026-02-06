import os
import google.generativeai as genai
from typing import Dict, Any, List, Optional
from datetime import datetime
from container import container
from dotenv import load_dotenv

# Robustly load .env from current directory (backend/)
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

class GeminiService:
    """
    Service for integrating with Google Gemini AI for quantum tutoring and analysis
    """
    
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        if self.api_key:
            print(f"DEBUG: Gemini API Key found. Activating Gemini AI...")
            print(f"DEBUG: API Key length: {len(self.api_key)}")
            try:
                genai.configure(api_key=self.api_key)
                self.model = genai.GenerativeModel('gemini-2.5-flash')
                print(f"SUCCESS: Gemini AI Service Activated (Model: gemini-2.5-flash)")
            except Exception as e:
                print(f"ERROR: Failed to configure Gemini: {e}")
                self.model = None
        else:
            print("WARNING: GEMINI_API_KEY not found in environment!")
            self.model = None

    async def generate_response(self, question: str, context: Optional[str] = None) -> str:
        """
        Generate a response to a user question using Gemini
        """
        print(f"DEBUG: GeminiService.generate_response called for: {question[:30]}...")
        
        if not self.api_key or not self.model:
            print("ERROR: Gemini not configured properly")
            return "Gemini API key not configured. Please add GEMINI_API_KEY to your .env file."

        try:
            full_prompt = question
            if context:
                full_prompt = f"Context: {context}\n\nQuestion: {question}"
            
            # Add system instruction for the tutor
            system_instruction = "You are a friendly and knowledgeable Quantum Computing Tutor. Your goal is to help students understand quantum mechanics, quantum circuits, and quantum algorithms. Keep your explanations clear, concise, and accurate. If you use mathematical notation, explain it simply."
            
            print("DEBUG: Sending request to Gemini API (async)...")
            # Use async generation
            response = await self.model.generate_content_async(
                f"{system_instruction}\n\nUser: {full_prompt}"
            )
            print("DEBUG: Received response from Gemini API")
            
            # Check if response was blocked by safety filters
            if not response.parts:
                print("WARNING: Gemini response blocked by safety filters")
                print(f"DEBUG: Response feedback: {response.prompt_feedback}")
                return "The AI response was blocked by safety filters. Please try rephrasing your question."

            print(f"DEBUG: Response generated successfully (Length: {len(response.text)})")
            return response.text
        except Exception as e:
            print(f"ERROR: Exception in Gemini generation: {e}")
            import traceback
            traceback.print_exc()
            container.logger().error("gemini_generation_failed", error=str(e))
            return f"Error generating response from Gemini: {str(e)}"

    def is_configured(self) -> bool:
        return self.api_key is not None and self.model is not None

gemini_service = GeminiService()
