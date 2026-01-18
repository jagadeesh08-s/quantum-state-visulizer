import requests

def test_connect():
    url = "http://localhost:3005/api/ibm/connect"
    payload = {"token": "YOUR_IBM_QUANTUM_TOKEN_HERE"}
    try:
        response = requests.post(url, json=payload)
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {response.headers}")
        print(f"Response Body: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_connect()
