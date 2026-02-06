import os
import sys
import google.generativeai as genai
from dotenv import load_dotenv

def verify_gemini():
    print("=== Gemini Configuration Diagnostic ===")
    
    # Determine local .env path
    current_dir = os.path.dirname(os.path.abspath(__file__))
    env_path = os.path.join(current_dir, '.env')
    
    print(f"Checking for .env at: {env_path}")
    if os.path.exists(env_path):
        print("✅ .env file found")
        load_dotenv(env_path)
    else:
        print("❌ .env file NOT found at expected location")
        # Try loading from parent variables just in case
    
    api_key = os.getenv("GEMINI_API_KEY")
    
    if not api_key:
        print("❌ GEMINI_API_KEY not found in environment variables")
        print("Please add GEMINI_API_KEY=your_key_here to your .env file")
        return False
        
    mask_key = f"{api_key[:5]}...{api_key[-5:]}" if len(api_key) > 10 else "INVALID_LENGTH"
    print(f"✅ API Key found: {mask_key}")
    
    print("\nAttempting to connect to Google Gemini API...")
    try:
        genai.configure(api_key=api_key)
        
        print("Listing available models...")
        models = [m.name for m in genai.list_models() if 'generateContent' in m.supported_generation_methods]
        
        found_target = any("gemini-2.5-flash" in m for m in models)
        
        if found_target:
            print(f"✅ Target model 'gemini-2.5-flash' is available")
        else:
            print("⚠️ 'gemini-2.5-flash' not explicitly found in list (might still work if valid)")
            print(f"Available models: {models[:5]}...")

        print("\nSending test prompt...")
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content("Reply with 'Working' if you can read this.")
        
        print(f"✅ Response received: {response.text.strip()}")
        print("\n>>> Gemini Integration Verified Successfully! <<<")
        return True
        
    except Exception as e:
        print(f"\n❌ API Connection Failed: {e}")
        return False

if __name__ == "__main__":
    success = verify_gemini()
    sys.exit(0 if success else 1)
