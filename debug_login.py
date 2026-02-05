import requests
import json

url = "http://127.0.0.1:8000/api/auth/login/"
headers = {"Content-Type": "application/json"}
data = {
    "email": "test@example.com", 
    "password": "password123" 
} # Use dummy data, we just want to see validation errors like 'username is required'

try:
    response = requests.post(url, headers=headers, json=data)
    print(f"Status Code: {response.status_code}")
    print("Response Body:")
    print(response.text)
except Exception as e:
    print(f"Error: {e}")
