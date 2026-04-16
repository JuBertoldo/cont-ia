from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from firebase_admin import auth as firebase_auth
from ultralytics import YOLO

from app.services.yolo_service import get_model

_bearer = HTTPBearer()


def get_yolo_model() -> YOLO:
    """Dependency que retorna o modelo YOLO já carregado (singleton)."""
    return get_model()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> dict:
    """Valida o Firebase ID token e retorna o payload decodificado."""
    try:
        decoded = firebase_auth.verify_id_token(credentials.credentials)
        return decoded
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
