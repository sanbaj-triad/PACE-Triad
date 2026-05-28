from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from . import database, crud, models, auth
from .logger import get_logger

logger = get_logger("app.dependencies")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

async def get_current_user(request: Request, token: str = Depends(oauth2_scheme), db: Session = Depends(database.get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            logger.warning(f"TOKEN INVALID: sub claim missing | Attempted {request.url.path}")
            raise credentials_exception
        token_data = {"username": username} # Simplified
    except JWTError:
        logger.warning(f"TOKEN EXPIRED / INVALID: JWT signature decoding failed | Attempted {request.url.path}")
        raise credentials_exception
    
    user = crud.get_user_by_username(db, username=username)
    if user is None:
        logger.warning(f"TOKEN INVALID: User {username} not found in database | Attempted {request.url.path}")
        raise credentials_exception
    
    request.state.user_id = user.id
    return user

async def get_current_active_user(current_user: models.User = Depends(get_current_user)):
    if not getattr(current_user, 'is_active', True) or getattr(current_user, 'locked_out', False):
        raise HTTPException(status_code=400, detail="Inactive or locked user")
    return current_user
