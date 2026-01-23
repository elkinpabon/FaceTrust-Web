"""
WebAuthn Service
Handles WebAuthn registration and authentication flows
"""
import secrets
import base64
from typing import Dict, Optional
from flask import current_app
from webauthn import (
    generate_registration_options,
    verify_registration_response,
    generate_authentication_options,
    verify_authentication_response,
    options_to_json
)
from webauthn.helpers.structs import (
    PublicKeyCredentialDescriptor,
    AuthenticatorSelectionCriteria,
    UserVerificationRequirement,
    ResidentKeyRequirement,
    AuthenticatorAttachment
)
from webauthn.helpers.cose import COSEAlgorithmIdentifier

from app.models import db
from app.models.user import User
from app.models.credential import WebAuthnCredential

# In-memory challenge storage (for development)
# In production, consider using database or proper session management
_challenge_store = {}


class WebAuthnService:
    """
    WebAuthn Service
    
    Maneja el flujo completo de WebAuthn:
    1. Registro: Genera challenge y opciones, verifica respuesta
    2. Autenticación: Genera challenge y opciones, verifica assertion
    
    NO maneja ni almacena datos biométricos - solo claves públicas.
    """
    
    @staticmethod
    def generate_registration_challenge(user: User) -> Dict:
        """
        Generate WebAuthn registration options
        
        Args:
            user: User instance
        
        Returns:
            Dictionary with registration options
        """
        # Get RP configuration
        rp_id = current_app.config['RP_ID']
        rp_name = current_app.config['RP_NAME']
        origin = current_app.config['ORIGIN']
        
        # Generate user handle (opaque identifier)
        user_handle = base64.urlsafe_b64encode(str(user.id).encode()).decode().rstrip('=')
        
        # Exclude existing credentials to avoid duplicates
        existing_credentials = WebAuthnCredential.get_user_credentials(user.id)
        exclude_credentials = [
            PublicKeyCredentialDescriptor(id=base64.urlsafe_b64decode(cred.credential_id + '=='))
            for cred in existing_credentials
        ]
        
        # Generate registration options
        options = generate_registration_options(
            rp_id=rp_id,
            rp_name=rp_name,
            user_id=user_handle,
            user_name=user.email,
            user_display_name=user.name,
            exclude_credentials=exclude_credentials,
            authenticator_selection=AuthenticatorSelectionCriteria(
                authenticator_attachment=AuthenticatorAttachment.PLATFORM,  # Prefer platform authenticators (FaceID, Windows Hello)
                resident_key=ResidentKeyRequirement.PREFERRED,
                user_verification=UserVerificationRequirement.REQUIRED  # Require biometric/PIN
            ),
            supported_pub_key_algs=[
                COSEAlgorithmIdentifier.ECDSA_SHA_256,
                COSEAlgorithmIdentifier.RSASSA_PKCS1_v1_5_SHA_256
            ],
            timeout=60000  # 60 seconds
        )
        
        # Store challenge in memory for verification
        challenge_key = f'webauthn:registration:{user.id}'
        WebAuthnService._store_challenge(challenge_key, options.challenge, ttl=60)
        
        # Convert to JSON-serializable format
        return {
            'options': options_to_json(options),
            'user_id': user.id
        }
    
    @staticmethod
    def verify_registration(user_id: int, credential_response: Dict) -> Dict:
        """
        Verify WebAuthn registration response and store credential
        
        Args:
            user_id: User ID
            credential_response: Registration response from client
        
        Returns:
            Dictionary with verification result
        
        Raises:
            ValueError: If verification fails
        """
        # Get user
        user = User.query.get(user_id)
        if not user:
            raise ValueError('User not found')
        
        # Retrieve stored challenge
        challenge_key = f'webauthn:registration:{user_id}'
        expected_challenge = WebAuthnService._get_challenge(challenge_key)
        
        if not expected_challenge:
            raise ValueError('Challenge expired or not found')
        
        # Get RP configuration
        rp_id = current_app.config['RP_ID']
        expected_origin = current_app.config['EXPECTED_ORIGIN']
        
        try:
            # Verify registration response
            verification = verify_registration_response(
                credential=credential_response,
                expected_challenge=expected_challenge,
                expected_rp_id=rp_id,
                expected_origin=expected_origin,
                require_user_verification=True
            )
            
            # Store credential in database
            credential = WebAuthnCredential(
                user_id=user_id,
                credential_id=base64.urlsafe_b64encode(verification.credential_id).decode().rstrip('='),
                public_key=base64.b64encode(verification.credential_public_key).decode(),
                sign_count=verification.sign_count,
                aaguid=str(verification.aaguid) if verification.aaguid else None,
                transports=credential_response.get('transports', []),
                device_type=verification.credential_device_type.value if verification.credential_device_type else None,
                backup_eligible=verification.credential_backed_up if hasattr(verification, 'credential_backed_up') else False
            )
            
            db.session.add(credential)
            db.session.commit()
            
            # Delete challenge
            WebAuthnService._delete_challenge(challenge_key)
            
            return {
                'success': True,
                'credential_id': credential.credential_id,
                'message': 'Credential registered successfully'
            }
            
        except Exception as e:
            current_app.logger.error(f'Registration verification failed: {str(e)}')
            raise ValueError(f'Registration verification failed: {str(e)}')
    
    @staticmethod
    def generate_authentication_challenge(email: str) -> Dict:
        """
        Generate WebAuthn authentication options
        
        Args:
            email: User email
        
        Returns:
            Dictionary with authentication options
        
        Raises:
            ValueError: If user not found or has no credentials
        """
        # Get user
        user = User.get_by_email(email)
        if not user or not user.is_active:
            raise ValueError('User not found or inactive')
        
        # Get user's credentials
        credentials = WebAuthnCredential.get_user_credentials(user.id)
        if not credentials:
            raise ValueError('No credentials registered for this user')
        
        # Get RP configuration
        rp_id = current_app.config['RP_ID']
        
        # Convert credentials to WebAuthn format
        allow_credentials = [
            PublicKeyCredentialDescriptor(
                id=base64.urlsafe_b64decode(cred.credential_id + '==')
            )
            for cred in credentials
        ]
        
        # Generate authentication options
        options = generate_authentication_options(
            rp_id=rp_id,
            allow_credentials=allow_credentials,
            user_verification=UserVerificationRequirement.REQUIRED,
            timeout=60000  # 60 seconds
        )
        
        # Store challenge in memory for verification
        challenge_key = f'webauthn:authentication:{user.id}'
        WebAuthnService._store_challenge(challenge_key, options.challenge, ttl=60)
        
        return {
            'options': options_to_json(options),
            'user_id': user.id
        }
    
    @staticmethod
    def verify_authentication(user_id: int, credential_response: Dict) -> Dict:
        """
        Verify WebAuthn authentication response
        
        Args:
            user_id: User ID
            credential_response: Authentication response from client
        
        Returns:
            Dictionary with verification result including user data
        
        Raises:
            ValueError: If verification fails
        """
        # Get user
        user = User.query.get(user_id)
        if not user or not user.is_active:
            raise ValueError('User not found or inactive')
        
        # Retrieve stored challenge
        challenge_key = f'webauthn:authentication:{user_id}'
        expected_challenge = WebAuthnService._get_challenge(challenge_key)
        
        if not expected_challenge:
            raise ValueError('Challenge expired or not found')
        
        # Get credential
        credential_id = credential_response.get('id')
        credential = WebAuthnCredential.get_by_credential_id(credential_id)
        
        if not credential or credential.user_id != user_id:
            raise ValueError('Invalid credential')
        
        # Get RP configuration
        rp_id = current_app.config['RP_ID']
        expected_origin = current_app.config['EXPECTED_ORIGIN']
        
        # Decode public key
        public_key = base64.b64decode(credential.public_key)
        
        try:
            # Verify authentication response
            verification = verify_authentication_response(
                credential=credential_response,
                expected_challenge=expected_challenge,
                expected_rp_id=rp_id,
                expected_origin=expected_origin,
                credential_public_key=public_key,
                credential_current_sign_count=credential.sign_count,
                require_user_verification=True
            )
            
            # Update sign count (anti-cloning)
            credential.update_sign_count(verification.new_sign_count)
            
            # Delete challenge
            WebAuthnService._delete_challenge(challenge_key)
            
            return {
                'success': True,
                'user': user.to_dict(),
                'message': 'Authentication successful'
            }
            
        except Exception as e:
            current_app.logger.error(f'Authentication verification failed: {str(e)}')
            raise ValueError(f'Authentication verification failed: {str(e)}')
    
    @staticmethod
    def _store_challenge(key: str, challenge: bytes, ttl: int = 60):
        """Store challenge in memory with expiration."""
        import time
        challenge_str = base64.b64encode(challenge).decode()
        _challenge_store[key] = {
            'challenge': challenge_str,
            'expires_at': time.time() + ttl
        }
    
    @staticmethod
    def _get_challenge(key: str) -> Optional[bytes]:
        """Retrieve challenge from memory if not expired."""
        import time
        data = _challenge_store.get(key)
        if data and time.time() < data['expires_at']:
            return base64.b64decode(data['challenge'])
        
        # Clean up expired challenge
        if data:
            del _challenge_store[key]
        
        return None
    
    @staticmethod
    def _delete_challenge(key: str):
        """Delete challenge from memory."""
        _challenge_store.pop(key, None)
