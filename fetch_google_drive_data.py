#!/usr/bin/env python3
"""
Script to fetch and count the number of files or data entries in a Google Drive folder.
Handles authentication and access issues gracefully.
"""

import os
import requests
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# Configuration
SERVICE_ACCOUNT_FILE = 'service_account.json'  # Replace with your service account file
FOLDER_ID = '1OFz-Oro_dK2HEvtVcbLNM8H6fcnrWJbC'


def authenticate_google_drive():
    """Authenticate with Google Drive using a service account."""
    try:
        # Check if the service account file exists
        if not os.path.exists(SERVICE_ACCOUNT_FILE):
            raise FileNotFoundError(f"Service account file '{SERVICE_ACCOUNT_FILE}' not found.")

        # Authenticate using the service account
        credentials = service_account.Credentials.from_service_account_file(
            SERVICE_ACCOUNT_FILE,
            scopes=['https://www.googleapis.com/auth/drive.readonly']
        )

        # Build the Google Drive service
        service = build('drive', 'v3', credentials=credentials)
        return service
    except Exception as e:
        print(f"Authentication failed: {e}")
        return None


def count_files_in_folder(service, folder_id):
    """Count the number of files in a Google Drive folder."""
    try:
        # Query files in the specified folder
        query = f"'{folder_id}' in parents and trashed = false"
        results = service.files().list(
            q=query,
            fields="files(id, name, mimeType)"
        ).execute()

        items = results.get('files', [])
        return len(items)
    except HttpError as e:
        print(f"An error occurred while accessing Google Drive: {e}")
        return -1


def main():
    """Main function to execute the script."""
    print("Fetching data from Google Drive...")

    # Authenticate with Google Drive
    service = authenticate_google_drive()
    if not service:
        print("Failed to authenticate. Please ensure the service account file is valid.")
        return

    # Count files in the specified folder
    count = count_files_in_folder(service, FOLDER_ID)
    if count >= 0:
        print(f"Number of files/data entries in the folder: {count}")
    else:
        print("Failed to count files due to an error.")


if __name__ == "__main__":
    main()