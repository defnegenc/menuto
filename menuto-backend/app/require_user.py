# app/require_user.py
import os
import logging
from fastapi import Header, HTTPException
from jwt import decode as jwt_decode, InvalidTokenError

logger = logging.getLogger(__name__)

JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")
DEV = (os.getenv("API_ENV") or "prod").lower() == "dev"

logger.info("[auth] Supabase JWT validator configured (dev=%s)", DEV)

async def require_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        if DEV:
            logger.warning("Dev mode: No auth header, allowing request")
            return {"sub": "dev-user", "email": "dev@example.com"}
        raise HTTPException(status_code=401, detail="Missing token")

    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt_decode(
            token,
            JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
        return payload
    except InvalidTokenError as e:
        logger.warning("Invalid token: %s", e)
        if DEV:
            # In dev mode, decode without verification to extract user info
            try:
                unverified = jwt_decode(token, options={"verify_signature": False})
                logger.warning("Dev mode: Using unverified token for sub=%s", unverified.get("sub"))
                return unverified
            except Exception:
                pass
            logger.warning("Dev mode: Falling back to dev-user")
            return {"sub": "dev-user", "email": "dev@example.com"}
        raise HTTPException(status_code=401, detail="Invalid token")
