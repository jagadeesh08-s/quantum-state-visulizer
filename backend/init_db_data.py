import asyncio
import os
from dotenv import load_dotenv
from database import init_database, create_tables, get_session
from medical_core import download_csv_from_drive, medical_core

# Load env
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

async def initialize_data():
    print("--- STARTING DATA INITIALIZATION ---")
    url = os.getenv("MEDICAL_DATASET_URL")
    if not url:
        print("ERROR: No MEDICAL_DATASET_URL found in .env")
        return

    print(f"Target URL: {url}")
    
    # Initialize DB
    print("Initializing Database...")
    init_database()
    await create_tables()
    
    # Download Data
    print("Downloading data from Drive (this may take a moment)...")
    try:
        # We run this synchronously here since it's a script
        df = download_csv_from_drive(url)
        print(f"Download Complete. Rows: {len(df)}")
        
        # Train/Process
        print("Processing/Training model...")
        result = medical_core.train(df)
        print(f"Training Complete. Classes: {result['classes']}")
        
        # Save to DB
        print("Saving to SQLite Database...")
        async for session in get_session():
            await medical_core.save_to_db(session, origin="Google Drive (Init Script)")
            print("Save to DB successful!")
            break
            
    except Exception as e:
        print(f"FAILED: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(initialize_data())
