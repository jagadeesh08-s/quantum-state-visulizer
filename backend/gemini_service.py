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
            try:
                genai.configure(api_key=self.api_key)
                self.model = genai.GenerativeModel('gemini-pro-latest')
                print(f"SUCCESS: Gemini AI Service Activated (Model: gemini-pro-latest)")
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
        if not self.api_key or not self.model:
            return "Gemini API key not configured. Please add GEMINI_API_KEY to your .env file."

        try:
            full_prompt = question
            if context:
                full_prompt = f"Context: {context}\n\nQuestion: {question}"
            
            # Add system instruction for the tutor
            system_instruction = "You are a friendly and knowledgeable Quantum Computing Tutor. Your goal is to help students understand quantum mechanics, quantum circuits, and quantum algorithms. Keep your explanations clear, concise, and accurate. If you use mathematical notation, explain it simply."
            
            response = self.model.generate_content(
                f"{system_instruction}\n\nUser: {full_prompt}"
            )
            
            return response.text
        except Exception as e:
            container.logger().error("gemini_generation_failed", error=str(e))
            return f"Error generating response from Gemini: {str(e)}"

    def is_configured(self) -> bool:
        return self.api_key is not None and self.model is not None

gemini_service = GeminiService()
