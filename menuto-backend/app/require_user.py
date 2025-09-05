# app/require_user.py
import os
from fastapi import Header, HTTPException
from jwt import PyJWKClient, decode as jwt_decode, InvalidTokenError

ISSUER = (os.getenv("CLERK_ISSUER") or "").rstrip("/")
AUDIENCE = os.getenv("CLERK_AUDIENCE") or ""
JWKS_URL = os.getenv("CLERK_JWKS_URL") or f"{ISSUER}/.well-known/jwks.json"
DEV = (os.getenv("API_ENV") or "prod").lower() == "dev"

print("[auth] PyJWT validator -> iss:", ISSUER, "aud:", AUDIENCE)

# cache the JWK client
_jwk_client = PyJWKClient(JWKS_URL) if JWKS_URL else None

async def require_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")

    token = authorization.split(" ", 1)[1]
    try:
        if not _jwk_client:
            raise HTTPException(status_code=500, detail="JWKS not configured")

        signing_key = _jwk_client.get_signing_key_from_jwt(token)
        payload = jwt_decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            issuer=ISSUER,
            audience=AUDIENCE or None,
            options={"verify_aud": bool(AUDIENCE)},
            leeway=60,
        )
        return payload

    except InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=(str(e) if DEV else "Invalid token"))
    except Exception as e:
        raise HTTPException(status_code=401, detail=(str(e) if DEV else "Invalid token"))
