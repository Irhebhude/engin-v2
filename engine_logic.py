import requests

# --- CONFIGURATION ---
TOKEN = "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"  # Create a NEW token first!
USER = "Irhebhude"
REPO = "engine-v1"
# ---------------------

url = f"https://api.github.com/repos/{USER}/{REPO}"
headers = {
    "Authorization": f"token {TOKEN}",
    "Accept": "application/vnd.github.v3+json"
}

print("Checking connection...")
response = requests.get(url, headers=headers)

if response.status_code == 200:
    print("✅ SUCCESS: Your new token works!")
    print(f"Repository: {response.json()['full_name']}")
else:
    print(f"❌ ERROR: {response.status_code}")
    print(response.json())
