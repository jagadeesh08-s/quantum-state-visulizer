import os
import asyncio
from dotenv import load_dotenv
from qiskit_ibm_runtime import QiskitRuntimeService
import traceback

# Load environment variables from .env file
load_dotenv()

async def test_token():
    token = os.getenv("IBM_QUANTUM_TOKEN")
    if not token:
        print("ERROR: IBM_QUANTUM_TOKEN not found in environment. Set it in your .env file.")
        return
    print(f"Testing token: {token[:10]}...")
    try:
        service = QiskitRuntimeService(channel="ibm_quantum_platform", token=token)
        print("Service initialized.")
        account = service.active_account()
        print(f"Account: {account}")
        backends = service.backends(limit=1)
        print(f"Backends available: {len(list(backends)) > 0}")
    except Exception as e:
        print(f"Error: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_token())
