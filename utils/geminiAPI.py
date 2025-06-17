#!/usr/bin/env python3
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
            { "parts": [{ "text": content }] }
        ]
    }
    headers = { "Content-Type": "application/json" }

    try:
        resp = requests.post(url, headers=headers, json=payload, timeout=30)
        data = resp.json()
        if resp.status_code != 200:
            return {
                "candidates": [],
                "error": f"HTTP {resp.status_code}",
                "details": data
            }
        return data
    except Exception as e:
        return { "candidates": [], "error": str(e) }

def main():
    content = sys.stdin.read() or ""
    result  = call_gemini_api(content)
    # Ensure at least empty candidates list
    if "candidates" not in result:
        result["candidates"] = []
    sys.stdout.write(json.dumps(result, ensure_ascii=False))

if __name__ == "__main__":
    main()
