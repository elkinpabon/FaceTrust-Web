"""
Authentication Service
Handles JWT tokens, sessions, and OTP fallback
"""
import secrets
import hashlib
import time
from datetime import datetime, timedelta
from typing import Dict, Tuple, Optional
from flask import current_app, request
from flask_jwt_extended import create_access_token, create_refresh_token

from app.models import db
from app.models.user import User
from app.models.session import Session
from app.services.audit_service import AuditService

# In-memory OTP storage (for development)
_otp_store = {}


class AuthService:
    """
    Authentication Service
    
    Maneja:
    - Generación de tokens JWT
    - Gestión de sesiones
    - Revocación de tokens
    - Fallback OTP (si WebAuthn falla)
    """
    
    @staticmethod
    def create_tokens(user: User) -> Dict:
        """
        Create access and refresh tokens for user
        
        Args:
            user: User instance
        
        Returns:
            Dictionary with tokens and user data
        """
        # Create tokens - flask-jwt-extended auto-generates JTI
        # NOTE: identity must be a string, so convert user.id to str
        access_token = create_access_token(
            identity=str(user.id),
            additional_claims={
                'email': user.email,
                'role': user.role.value
            }
        )
        
        refresh_token = create_refresh_token(
            identity=str(user.id)
        )
        
        # Extract the JTI that flask-jwt-extended generated
        import jwt as pyjwt
        decoded_access = pyjwt.decode(access_token, options={"verify_signature": False})
        decoded_refresh = pyjwt.decode(refresh_token, options={"verify_signature": False})
        
        jti_access = decoded_access.get('jti')
        jti_refresh = decoded_refresh.get('jti')
        
        print(f"[DEBUG create_tokens] Access token JTI: {jti_access}")
        print(f"[DEBUG create_tokens] Refresh token JTI: {jti_refresh}")
        
        # Store session in database with the actual JTI from the token
        expires_at = datetime.utcnow() + current_app.config['JWT_ACCESS_TOKEN_EXPIRES']
        
        Session.create_session(
            user_id=user.id,
            jti=jti_access,
            expires_at=expires_at,
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        
        print(f"[DEBUG create_tokens] Session created with JTI: {jti_access}")
        
        # Log successful login
        AuditService.log_action(
            action='user.login.success',
            user_id=user.id,
            success=True,
            details={'method': 'webauthn'}
        )
        
        return {
            'access_token': access_token,
            'refresh_token': refresh_token,
            'token_type': 'Bearer',
            'expires_in': int(current_app.config['JWT_ACCESS_TOKEN_EXPIRES'].total_seconds()),
            'user': user.to_dict()
        }
    
    @staticmethod
    def refresh_tokens(refresh_token: str) -> Dict:
        """
        Refresh access token using refresh token
        
        Args:
            refresh_token: Valid refresh token
        
        Returns:
            Dictionary with new access token
        
        Raises:
            ValueError: If refresh token is invalid or revoked
        """
        # Get current identity from refresh token
        user_id = int(get_jwt_identity())  # Convert string to int
        jwt_data = get_jwt()
        
        # Verify user still exists and is active
        user = User.query.get(user_id)
        if not user or not user.is_active:
            raise ValueError('User not found or inactive')
        
        # Generate new access token
        jti_access = secrets.token_urlsafe(32)
        
        access_token = create_access_token(
            identity=user.id,
            additional_claims={
                'email': user.email,
                'role': user.role.value,
                'jti': jti_access
            }
        )
        
        # Store new session
        expires_at = datetime.utcnow() + current_app.config['JWT_ACCESS_TOKEN_EXPIRES']
        
        Session.create_session(
            user_id=user.id,
            jti=jti_access,
            expires_at=expires_at,
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        
        return {
            'access_token': access_token,
            'token_type': 'Bearer',
            'expires_in': int(current_app.config['JWT_ACCESS_TOKEN_EXPIRES'].total_seconds())
        }
    
    @staticmethod
    def logout(user_id: int):
        """
        Logout user by revoking current session
        
        Args:
            user_id: User ID
        """
        # Get current JWT
        jwt_data = get_jwt()
        jti = jwt_data.get('jti')
        
        if jti:
            # Revoke specific session
            token_hash = Session.hash_token(jti)
            session = Session.query.filter_by(token_hash=token_hash).first()
            
            if session:
                session.revoke()
        
        # Log logout
        AuditService.log_action(
            action='user.logout',
            user_id=user_id,
            success=True
        )
    
    @staticmethod
    def logout_all_sessions(user_id: int):
        """
        Logout user from all devices by revoking all sessions
        
        Args:
            user_id: User ID
        
        Returns:
            Number of revoked sessions
        """
        count = Session.revoke_user_sessions(user_id)
        
        # Log action
        AuditService.log_action(
            action='user.logout.all',
            user_id=user_id,
            success=True,
            details={'revoked_sessions': count}
        )
        
        return count
    
    @staticmethod
    def is_token_revoked(jti: str) -> bool:
        """
        Check if token is revoked
        
        Args:
            jti: JWT ID
        
        Returns:
            Boolean indicating revocation status
        """
        print(f"[DEBUG is_token_revoked] Checking JTI: {jti}")
        result = Session.is_token_revoked(jti)
        print(f"[DEBUG is_token_revoked] JTI {jti[:10]}... is_revoked: {result}")
        return result
    
    @staticmethod
    def get_active_sessions(user_id: int):
        """
        Get all active sessions for user
        
        Args:
            user_id: User ID
        
        Returns:
            List of active sessions
        """
        return Session.get_active_sessions(user_id)
    
    # ==================== FALLBACK AUTHENTICATION ====================
    
    @staticmethod
    def generate_otp(user_id: int) -> str:
        """
        Generate One-Time Password for fallback authentication
        
        Args:
            user_id: User ID
        
        Returns:
            Generated OTP code
        
        Note:
            Solo usar cuando WebAuthn falla completamente.
            OTP se envía por email y expira en 5 minutos.
        """
        if not current_app.config['OTP_ENABLED']:
            raise ValueError('OTP fallback is disabled')
        
        # Generate random OTP
        otp_length = current_app.config['OTP_LENGTH']
        otp = ''.join([str(secrets.randbelow(10)) for _ in range(otp_length)])
        
        # Store OTP in memory with expiration
        otp_key = f'otp:{user_id}'
        ttl = current_app.config['OTP_EXPIRY']
        
        _otp_store[otp_key] = {
            'otp': otp,
            'expires_at': time.time() + ttl
        }
        
        # Log OTP generation
        AuditService.log_action(
            action='auth.otp.generated',
            user_id=user_id,
            success=True,
            details={'method': 'fallback'}
        )
        
        return otp
    
    @staticmethod
    def verify_otp(user_id: int, otp: str) -> bool:
        """
        Verify One-Time Password
        
        Args:
            user_id: User ID
            otp: OTP code to verify
        
        Returns:
            Boolean indicating verification success
        """
        if not current_app.config['OTP_ENABLED']:
            raise ValueError('OTP fallback is disabled')
        
        # Retrieve OTP from memory
        otp_key = f'otp:{user_id}'
        data = _otp_store.get(otp_key)
        
        if not data or time.time() > data['expires_at']:
            # Clean up expired OTP
            if data:
                del _otp_store[otp_key]
            
            # Log failed verification
            AuditService.log_action(
                action='auth.otp.failed',
                user_id=user_id,
                success=False,
                details={'reason': 'expired_or_not_found'}
            )
            return False
        
        # Compare OTP (constant-time comparison)
        is_valid = secrets.compare_digest(otp, data['otp'])
        
        if is_valid:
            # Delete OTP after successful verification
            del _otp_store[otp_key]
            
            # Log successful verification
            AuditService.log_action(
                action='auth.otp.success',
                user_id=user_id,
                success=True
            )
        else:
            # Log failed verification
            AuditService.log_action(
                action='auth.otp.failed',
                user_id=user_id,
                success=False,
                details={'reason': 'invalid_code'}
            )
        
        return is_valid
    
    @staticmethod
    def send_otp_email(user: User, otp: str):
        """
        Send OTP via email
        
        Args:
            user: User instance
            otp: OTP code
        
        Note:
            Implementar con servicio de email (SendGrid, AWS SES, etc.)
        """
        # TODO: Implement email sending
        # Por ahora, solo log para desarrollo
        current_app.logger.info(f'OTP for {user.email}: {otp}')
        
        # En producción:
        # from flask_mail import Message, Mail
        # msg = Message(
        #     subject='FaceTrust - Código de verificación',
        #     recipients=[user.email],
        #     body=f'Tu código de verificación es: {otp}\n\nExpira en 5 minutos.'
        # )
        # mail.send(msg)
