import os
import asyncio
from qiskit_ibm_runtime import QiskitRuntimeService
import traceback

async def test_token():
    token = "YOUR_IBM_QUANTUM_TOKEN_HERE"
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
