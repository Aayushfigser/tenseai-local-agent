# utils/geminiAPI.py

import requests
import json
import sys

API_KEY = "AIzaSyB-wqbFfoubsd2AP9_m_38Itg0bfxKlA1Q"

def call_gemini_api(content):
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        "gemini-1.5-flash-latest:generateContent"
        f"?key={API_KEY}"
    )
    payload = {
        "contents": [
            {
                "parts": [
                    { "text": content }
                ]
            }
        ]
    }
    headers = { "Content-Type": "application/json" }

    try:
        resp = requests.post(url, headers=headers, json=payload)
        if resp.status_code == 200:
            return resp.json()
        else:
            return {
                "error": f"HTTP {resp.status_code}",
                "details": resp.json()
            }
    except requests.RequestException as e:
        return { "error": str(e) }

def main():
    # Read the entire prompt from stdin
    content = sys.stdin.read()

    # Call the Gemini API
    result = call_gemini_api(content)

    # Emit JSON to stdout
    print(json.dumps(result))

if __name__ == "__main__":
    main()
