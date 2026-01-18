import os
import requests
from typing import Optional, Dict, Any
from container import container

class IBMCloudAuth:
    """
    Handles IBM Cloud IAM authentication and token management
    """
    
    def __init__(self):
        self.iam_url = "https://iam.cloud.ibm.com/identity/token"

    async def get_bearer_token(self, api_key: str) -> Optional[str]:
        """Convert API key to IAM bearer token"""
        try:
            data = {
                "grant_type": "urn:ibm:params:oauth:grant-type:apikey",
                "apikey": api_key
            }
            headers = {
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json"
            }
            
            response = requests.post(self.iam_url, data=data, headers=headers)
            response.raise_for_status()
            
            return response.json().get("access_token")
        except Exception as e:
            container.logger().error("ibm_cloud_auth_failed", error=str(e))
            return None

    def validate_cloud_token(self, token: str) -> bool:
        """Validate if a token is a valid IBM Cloud token"""
        # Basic length and format check for JWT-like tokens
        return len(token) > 100 and "." in token

ibm_cloud_auth = IBMCloudAuth()
