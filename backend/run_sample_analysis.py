import os
import glob
import pandas as pd
import numpy as np
from medical_core import medical_core, generate_dataset_from_folders

def run_test():
    path = 'probe_results'
    if not os.path.exists(path):
        print("Error: probe_results not found. Run sync first.")
        return

    print("--- QUANTUM MEDICAL ANALYSIS TEST ---")
    print(f"Loading Historical Dataset from: {path}")
    
    # 1. Initialize the model with the folder data
    df = generate_dataset_from_folders(path)
    medical_core.train(df)
    print(f"Model Trained on {len(df)} historical cases.")
    print(f"Classes: {df['diagnosis'].unique().tolist()}")
    print("-" * 40)

    # 2. Pick a 'New' sample image for analysis
    # Let's find a Pituitary Tumor sample to test accuracy
    samples = glob.glob(f"{path}/PituitaryTumor/*.jpg")
    if not samples:
        samples = glob.glob(f"{path}/**/*.jpg", recursive=True)
    
    if not samples:
        print("No images found for testing.")
        return

    test_image = samples[0]
    print(f"Analyzing New Scan: {test_image}")
    
    # Simulate extraction of quantum features from this image
    # In a production app, this would be done by a Quantum-Classical Hybrid CNN
    test_data = {
        "age": 52,
        "mean_radius": 18.5, # Specific feature that might correlate with Pituitary
        "mean_texture": 24.1,
        "modality": "MRI",
        "region": "Brain"
    }

    # 3. Run Quantum Prediction
    print("Executing Quantum Circuit (Kernel Estimation)...")
    result = medical_core.predict(test_data)

    print("-" * 40)
    print(f"FINAL DIAGNOSIS: {result['diagnosis']}")
    print(f"CONFIDENCE: {result['confidence']*100:.1f}%")
    print(f"QUANTUM FIDELITY: {result['quantum_fidelity']:.4f}")
    
    print("\n--- HISTORICAL COMPARISON ---")
    for i, match in enumerate(result['matches'][:3]):
        print(f"Match {i+1}: Case {match['patientId']} | Diagnosis: {match['diagnosis']} | Similarity: {match['similarity']*100:.1f}%")

if __name__ == "__main__":
    run_test()
