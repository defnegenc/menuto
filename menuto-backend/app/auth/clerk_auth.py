import os
import jwt
from typing import Optional, Dict
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import requests
from dotenv import load_dotenv

load_dotenv()

# Clerk configuration
CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY")
CLERK_PUBLISHABLE_KEY = os.getenv("CLERK_PUBLISHABLE_KEY")

if not CLERK_SECRET_KEY:
    raise ValueError("CLERK_SECRET_KEY environment variable is required")

security = HTTPBearer()

class ClerkAuth:
    def __init__(self):
        self.secret_key = CLERK_SECRET_KEY
        self.publishable_key = CLERK_PUBLISHABLE_KEY
    
    def verify_token(self, token: str) -> Optional[Dict]:
        """Verify Clerk JWT token and return user data"""
        try:
            # Decode the JWT token
            payload = jwt.decode(
                token,
                self.secret_key,
                algorithms=["HS256"],
                audience="https://clerk.accounts.dev",
                issuer="https://clerk.accounts.dev"
            )
            
            return {
                "user_id": payload.get("sub"),
                "email": payload.get("email"),
                "first_name": payload.get("first_name"),
                "last_name": payload.get("last_name")
            }
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token has expired")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid token")
        except Exception as e:
            raise HTTPException(status_code=401, detail=f"Token verification failed: {str(e)}")
    
    def get_current_user(self, credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict:
        """Get current authenticated user"""
        token = credentials.credentials
        user_data = self.verify_token(token)
        if not user_data:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        return user_data

# Create global instance
clerk_auth = ClerkAuth()

# Dependency for protected routes
def get_current_user():
    return clerk_auth.get_current_user
