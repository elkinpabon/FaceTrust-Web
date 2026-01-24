"""Debug script to decode JWT token and verify configuration"""
import jwt
import os
from dotenv import load_dotenv

load_dotenv()

# Get JWT secret from env
jwt_secret = os.getenv('JWT_SECRET_KEY', 'dev-jwt-secret-CHANGE-IN-PRODUCTION')

print(f"JWT_SECRET_KEY from .env: {jwt_secret}")
print(f"Length: {len(jwt_secret)}")
print()

# Example token from frontend logs (paste one here)
token = input("Paste the access_token from frontend console: ").strip()

print("\n=== Attempting to decode ===")
try:
    # Try to decode with verification
    decoded = jwt.decode(token, jwt_secret, algorithms=['HS256'])
    print("✅ Token decoded successfully with SECRET KEY verification!")
    print(f"Payload: {decoded}")
except jwt.ExpiredSignatureError:
    print("❌ Token is expired")
except jwt.InvalidSignatureError:
    print("❌ Invalid signature - SECRET KEY mismatch!")
    # Try to decode without verification to see payload
    decoded = jwt.decode(token, options={"verify_signature": False})
    print(f"Payload (unverified): {decoded}")
except Exception as e:
    print(f"❌ Error: {e}")
    # Try to decode without verification
    try:
        decoded = jwt.decode(token, options={"verify_signature": False})
        print(f"Payload (unverified): {decoded}")
    except Exception as e2:
        print(f"❌ Cannot decode even without verification: {e2}")
