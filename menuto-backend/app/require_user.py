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
    # In dev mode, allow requests without proper auth for testing
    if DEV and (not authorization or not authorization.startswith("Bearer ")):
        logger.warning("Dev mode: Allowing request without auth")
        return {"sub": "dev-user", "email": "dev@example.com"}

    if not authorization or not authorization.startswith("Bearer "):
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
            logger.warning("Dev mode: Invalid token error, allowing request")
            return {"sub": "dev-user", "email": "dev@example.com"}
        raise HTTPException(status_code=401, detail="Invalid token")
