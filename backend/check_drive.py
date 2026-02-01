import gdown
import os
import shutil

def check_link():
    url = 'https://drive.google.com/drive/folders/1OFz-Oro_dK2HEvtVcbLNM8H6fcnrWJbC?usp=drive_link'
    output = 'test_download_folder'
    
    if os.path.exists(output):
        shutil.rmtree(output)
        
    try:
        print(f"Attempting to download from: {url}")
        files = gdown.download_folder(url, output=output, quiet=False, use_cookies=False)
        
        if os.path.exists(output):
            contents = os.listdir(output)
            print(f"Successfully accessed folder! Found {len(contents)} items.")
            for item in contents:
                item_path = os.path.join(output, item)
                if os.path.isdir(item_path):
                    print(f" [Folder] {item} (Contents: {os.listdir(item_path)})")
                else:
                    print(f" [File] {item}")
        else:
            print("Folder was not created. Link might not be public or is empty.")
            
    except Exception as e:
        print(f"DEBUG_ERROR: {e}")

if __name__ == "__main__":
    check_link()
