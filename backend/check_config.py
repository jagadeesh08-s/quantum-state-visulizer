from config import config
import os
from dotenv import load_dotenv
import pandas as pd
from medical_core import download_csv_from_drive

# Load .env from parent directory
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
load_dotenv(env_path)

print(f"Env MEDICAL_DATASET_URL: {os.getenv('MEDICAL_DATASET_URL')}")
url = os.getenv('MEDICAL_DATASET_URL')

if url:
    print("Attempting download...")
    try:
        df = download_csv_from_drive(url)
        print(f"Download success! Shape: {df.shape}")
    except Exception as e:
        print(f"Download failed: {e}")
else:
    print("No URL found")
