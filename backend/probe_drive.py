import gdown
import os
import glob

def probe_drive():
    url = 'https://drive.google.com/drive/folders/1OFz-Oro_dK2HEvtVcbLNM8H6fcnrWJbC?usp=drive_link'
    output = 'probe_results'
    
    print(f"Probing: {url}")
    try:
        # Try to download just the folder structure/metadata if possible
        # gdown doesn't have a 'list' only mode easily, but we can try to download to a temp location
        # and stop after 1 file
        gdown.download_folder(url, output=output, quiet=False, use_cookies=False, remaining_ok=True)
        
        csv_files = glob.glob(f"{output}/**/*.csv", recursive=True)
        img_files = glob.glob(f"{output}/**/*.*", recursive=True)
        
        print(f"PROBE_RESULT: Found {len(img_files)} total files.")
        if csv_files:
            print(f"PROBE_CSV: Found {len(csv_files)} CSV files! First one: {csv_files[0]}")
        else:
            print("PROBE_CSV: No CSV files found in the first batch.")
            
    except Exception as e:
        print(f"PROBE_ERROR: {e}")

if __name__ == "__main__":
    probe_drive()
