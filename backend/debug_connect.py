import os
import requests
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def test_connect():
    url = "http://localhost:3005/api/ibm/connect"
    token = os.getenv("IBM_QUANTUM_TOKEN")
    if not token:
        print("ERROR: IBM_QUANTUM_TOKEN not found in environment. Set it in your .env file.")
        return
    payload = {"token": token}
    try:
        response = requests.post(url, json=payload)
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {response.headers}")
        print(f"Response Body: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_connect()
