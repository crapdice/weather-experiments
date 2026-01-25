import requests
import json
import time

BASE_URL = "http://localhost:3000"

def test_security_headers():
    print("\n[Audit] Checking Security Headers...")
    try:
        response = requests.get(BASE_URL)
        headers = response.headers
        
        required_headers = [
            "X-Frame-Options",
            "X-Content-Type-Options",
            "Referrer-Policy"
        ]
        
        for header in required_headers:
            if header in headers:
                print(f"  [PASS] {header}: {headers[header]}")
            else:
                print(f"  [FAIL] Missing {header}")
    except Exception as e:
        print(f"  [ERROR] Could not connect to {BASE_URL}. Ensure the dev server is running.")

def test_feedback_injection():
    print("\n[Adversarial] Attempting Feedback Injection...")
    url = f"{BASE_URL}/api/feedback"
    
    # 1. Test empty body
    res1 = requests.post(url, json={})
    if res1.status_code == 400:
        print("  [PASS] Rejected empty body")
    else:
        print(f"  [FAIL] Accepted empty body (Status: {res1.status_code})")
        
    # 2. Test massive payload
    massive_feedback = "A" * 5000
    res2 = requests.post(url, json={"feedback": massive_feedback})
    if res2.status_code == 400:
        print("  [PASS] Rejected oversized payload (>2000 chars)")
    else:
        print(f"  [FAIL] Accepted oversized payload (Status: {res2.status_code})")

def test_weather_proxy_obfuscation():
    print("\n[Audit] Checking Weather API Obfuscation...")
    url = f"{BASE_URL}/api/weather?type=current"
    try:
        res = requests.get(url)
        content = res.text
        
        # Check if external API keys or URLs are leaked in the body
        if "open-meteo.com" in content:
            print("  [FAIL] Leaked external API URL in response body")
        else:
            print("  [PASS] No external URLs leaked in response")
            
        # Check if internal server errors provide too much detail
        res_fail = requests.get(f"{BASE_URL}/api/weather?type=invalid")
        if res_fail.status_code == 400:
             print("  [PASS] Handled invalid type correctly")
    except Exception as e:
        print(f"  [ERROR] Weather API test failed: {e}")

if __name__ == "__main__":
    print("=== KORD Intelligence Adversarial Agent ===")
    test_security_headers()
    test_feedback_injection()
    test_weather_proxy_obfuscation()
    print("\nAudit Complete.")
