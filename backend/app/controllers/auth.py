"""
Authentication Controller
WebAuthn registration, login, and OTP fallback endpoints
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.services.webauthn_service import WebAuthnService
from app.services.auth_service import AuthService
from app.services.user_service import UserService
from app.services.rate_limit_service import RateLimitService
from app.services.audit_service import AuditService
from app.middleware.rate_limit import limiter

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/register-begin', methods=['POST'])
# @limiter.limit("3 per 15 minutes")  # Desactivado para desarrollo
def register_begin():
    """
    Initiate WebAuthn registration
    
    Request Body:
        email (str): User email
        name (str): User full name
        role (str, optional): User role (default: 'client')
    
    Returns:
        WebAuthn registration options and user_id
    """
    data = request.get_json()
    
    if not data or 'email' not in data or 'name' not in data:
        return jsonify({
            'error': 'Email and name are required',
            'code': 'missing_fields'
        }), 400
    
    email = data['email'].lower()
    name = data['name']
    role = data.get('role', 'client')
    
    try:
        # Check rate limit (desactivado para desarrollo)
        # is_allowed, retry_after = RateLimitService.check_register_rate_limit(email)
        # 
        # if not is_allowed:
        #     return jsonify({
        #         'error': 'Too many registration attempts',
        #         'code': 'rate_limit_exceeded',
        #         'retry_after': retry_after
        #     }), 429
        
        # Create user
        user = UserService.create_user(email, name, role)
        
        # Generate WebAuthn registration options
        options = WebAuthnService.generate_registration_challenge(user)
        
        # Log registration attempt
        AuditService.log_registration(email, success=True)
        
        return jsonify(options), 200
        
    except ValueError as e:
        # Log failed registration
        AuditService.log_registration(email, success=False, reason=str(e))
        
        return jsonify({
            'error': str(e),
            'code': 'registration_failed'
        }), 400
    except Exception as e:
        # Log error
        print(f"[ERROR] Exception in register-begin: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        AuditService.log_registration(email, success=False, reason='internal_error')
        
        return jsonify({
            'error': 'Internal server error',
            'code': 'internal_error'
        }), 500


@auth_bp.route('/register-complete', methods=['POST'])
def register_complete():
    """
    Complete WebAuthn registration
    
    Request Body:
        user_id (int): User ID from register-begin
        credential (dict): WebAuthn credential response
    
    Returns:
        JWT tokens and user data
    """
    data = request.get_json()
    
    if not data or 'user_id' not in data or 'credential' not in data:
        return jsonify({
            'error': 'user_id and credential are required',
            'code': 'missing_fields'
        }), 400
    
    user_id = data['user_id']
    credential_response = data['credential']
    
    try:
        # Verify registration
        result = WebAuthnService.verify_registration(user_id, credential_response)
        
        # Get user
        user = UserService.get_user(user_id)
        
        # Create JWT tokens
        tokens_response = AuthService.create_tokens(user)
        
        # Log credential addition
        AuditService.log_credential_added(user_id, result['credential_id'])
        
        # Restructure response for frontend compatibility
        return jsonify({
            'user': tokens_response['user'],
            'tokens': {
                'access_token': tokens_response['access_token'],
                'refresh_token': tokens_response['refresh_token'],
                'token_type': tokens_response['token_type'],
                'expires_in': tokens_response['expires_in']
            }
        }), 200
        
    except ValueError as e:
        return jsonify({
            'error': str(e),
            'code': 'verification_failed'
        }), 400
    except Exception as e:
        return jsonify({
            'error': 'Internal server error',
            'code': 'internal_error'
        }), 500


@auth_bp.route('/login-begin', methods=['POST'])
@limiter.limit("5 per 15 minutes")
def login_begin():
    """
    Initiate WebAuthn authentication
    
    Request Body:
        email (str): User email
    
    Returns:
        WebAuthn authentication options and user_id
    """
    data = request.get_json()
    
    if not data or 'email' not in data:
        return jsonify({
            'error': 'Email is required',
            'code': 'missing_fields'
        }), 400
    
    email = data['email'].lower()
    
    try:
        # Check rate limit
        is_allowed, retry_after = RateLimitService.check_login_rate_limit(email)
        
        if not is_allowed:
            return jsonify({
                'error': 'Too many login attempts',
                'code': 'rate_limit_exceeded',
                'retry_after': retry_after
            }), 429
        
        # Generate WebAuthn authentication options
        print(f"[DEBUG] Generating authentication challenge for {email}")
        options = WebAuthnService.generate_authentication_challenge(email)
        print(f"[DEBUG] Authentication options generated successfully")
        
        # Log login attempt
        AuditService.log_login_attempt(email, success=True)
        
        return jsonify(options), 200
        
    except ValueError as e:
        # Log failed login attempt
        print(f"[ERROR] ValueError in login-begin: {str(e)}")
        AuditService.log_login_attempt(email, success=False, reason=str(e))
        
        return jsonify({
            'error': str(e),
            'code': 'login_failed'
        }), 400
    except Exception as e:
        # Log error
        AuditService.log_login_attempt(email, success=False, reason='internal_error')
        
        return jsonify({
            'error': 'Internal server error',
            'code': 'internal_error'
        }), 500


@auth_bp.route('/login-complete', methods=['POST'])
def login_complete():
    """
    Complete WebAuthn authentication
    
    Request Body:
        user_id (int): User ID from login-begin
        assertion (dict): WebAuthn assertion response
    
    Returns:
        JWT tokens and user data
    """
    data = request.get_json()
    
    if not data or 'user_id' not in data or 'assertion' not in data:
        return jsonify({
            'error': 'user_id and assertion are required',
            'code': 'missing_fields'
        }), 400
    
    user_id = data['user_id']
    assertion_response = data['assertion']
    
    try:
        # Verify authentication
        result = WebAuthnService.verify_authentication(user_id, assertion_response)
        
        # Get user
        user = result['user']
        
        # Create JWT tokens
        tokens_response = AuthService.create_tokens(UserService.get_user(user['id']))
        
        # Restructure response for frontend compatibility
        return jsonify({
            'user': tokens_response['user'],
            'tokens': {
                'access_token': tokens_response['access_token'],
                'refresh_token': tokens_response['refresh_token'],
                'token_type': tokens_response['token_type'],
                'expires_in': tokens_response['expires_in']
            }
        }), 200
        
    except ValueError as e:
        # Log failed verification
        AuditService.log_login_attempt('unknown', success=False, reason=str(e))
        
        return jsonify({
            'error': str(e),
            'code': 'verification_failed'
        }), 400
    except Exception as e:
        return jsonify({
            'error': 'Internal server error',
            'code': 'internal_error'
        }), 500


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """
    Refresh access token using refresh token
    
    Returns:
        New access token
    """
    try:
        tokens = AuthService.refresh_tokens(request.headers.get('Authorization'))
        return jsonify(tokens), 200
    except ValueError as e:
        return jsonify({
            'error': str(e),
            'code': 'refresh_failed'
        }), 401


@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """
    Logout current session
    
    Returns:
        Success message
    """
    user_id = int(get_jwt_identity())  # Convert string to int
    
    AuthService.logout(user_id)
    
    return jsonify({
        'success': True,
        'message': 'Logged out successfully'
    }), 200


@auth_bp.route('/logout-all', methods=['POST'])
@jwt_required()
def logout_all():
    """
    Logout from all devices/sessions
    
    Returns:
        Success message with count of revoked sessions
    """
    user_id = int(get_jwt_identity())  # Convert string to int
    
    count = AuthService.logout_all_sessions(user_id)
    
    return jsonify({
        'success': True,
        'message': f'Logged out from {count} sessions',
        'revoked_sessions': count
    }), 200


# ==================== OTP FALLBACK ====================

@auth_bp.route('/otp/request', methods=['POST'])
@limiter.limit("3 per 15 minutes")
def request_otp():
    """
    Request OTP for fallback authentication
    
    Request Body:
        email (str): User email
    
    Returns:
        Success message
    """
    data = request.get_json()
    
    if not data or 'email' not in data:
        return jsonify({
            'error': 'Email is required',
            'code': 'missing_fields'
        }), 400
    
    email = data['email'].lower()
    
    try:
        # Get user
        user = UserService.get_user_by_email(email)
        
        if not user or not user.is_active:
            # Don't reveal if user exists
            return jsonify({
                'success': True,
                'message': 'If the email exists, an OTP has been sent',
                'expires_in': 300
            }), 200
        
        # Generate OTP
        otp = AuthService.generate_otp(user.id)
        
        # Send OTP via email
        AuthService.send_otp_email(user, otp)
        
        return jsonify({
            'success': True,
            'message': 'OTP sent to your email',
            'expires_in': 300
        }), 200
        
    except ValueError as e:
        return jsonify({
            'error': str(e),
            'code': 'otp_request_failed'
        }), 400
    except Exception as e:
        return jsonify({
            'error': 'Internal server error',
            'code': 'internal_error'
        }), 500


@auth_bp.route('/otp/verify', methods=['POST'])
@limiter.limit("5 per 15 minutes")
def verify_otp():
    """
    Verify OTP and login
    
    Request Body:
        email (str): User email
        otp (str): OTP code
    
    Returns:
        JWT tokens and user data
    """
    data = request.get_json()
    
    if not data or 'email' not in data or 'otp' not in data:
        return jsonify({
            'error': 'Email and OTP are required',
            'code': 'missing_fields'
        }), 400
    
    email = data['email'].lower()
    otp = data['otp']
    
    try:
        # Get user
        user = UserService.get_user_by_email(email)
        
        if not user or not user.is_active:
            return jsonify({
                'error': 'Invalid email or OTP',
                'code': 'verification_failed'
            }), 401
        
        # Verify OTP
        is_valid = AuthService.verify_otp(user.id, otp)
        
        if not is_valid:
            return jsonify({
                'error': 'Invalid or expired OTP',
                'code': 'verification_failed'
            }), 401
        
        # Create JWT tokens
        tokens = AuthService.create_tokens(user)
        
        return jsonify(tokens), 200
        
    except ValueError as e:
        return jsonify({
            'error': str(e),
            'code': 'verification_failed'
        }), 401
    except Exception as e:
        return jsonify({
            'error': 'Internal server error',
            'code': 'internal_error'
        }), 500


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """
    Get current authenticated user information
    
    Returns:
        Current user data and session information
    """
    from flask_jwt_extended import get_jwt_identity
    
    try:
        user_id = int(get_jwt_identity())  # Convert string to int
        user = UserService.get_user(user_id)
        
        if not user:
            return jsonify({
                'error': 'User not found',
                'code': 'user_not_found'
            }), 404
        
        return jsonify({
            'user': user.to_dict(),
            'authenticated': True
        }), 200
        
    except Exception as e:
        return jsonify({
            'error': 'Internal server error',
            'code': 'internal_error'
        }), 500
