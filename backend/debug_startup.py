
try:
    print("Importing medical_core...")
    from medical_core import medical_core
    print("medical_core imported successfully.")
    print(f"Target Attribute: {getattr(medical_core, 'target', 'MISSING')}")
    
    print("Importing main...")
    # We don't want to run the app, just import
    import main
    print("main imported successfully.")
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
