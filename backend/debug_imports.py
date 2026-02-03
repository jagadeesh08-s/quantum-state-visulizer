try:
    print("Importing quantum_simulator...")
    import quantum_simulator
    print("Importing quantum_executor...")
    import quantum_executor
    print("Imports successful!")
except Exception as e:
    print(f"IMPORT ERROR: {e}")
    import traceback
    traceback.print_exc()
