"""
JWT Middleware
Handles JWT token verification and extraction
"""
from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity

from app.models.user import User


def jwt_required_custom():
    """
    Custom JWT required decorator with additional checks
    """
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            # Verify JWT
            verify_jwt_in_request()
            
            # Get user ID from token
            user_id = get_jwt_identity()
            
            # Verify user still exists and is active
            user = User.query.get(user_id)
            if not user or not user.is_active:
                return jsonify({
                    'error': 'User not found or inactive',
                    'code': 'user_inactive'
                }), 401
            
            return fn(*args, **kwargs)
        
        return decorator
    return wrapper


def get_current_user():
    """
    Get current authenticated user from JWT
    
    Returns:
        User instance or None
    """
    try:
        user_id = get_jwt_identity()
        return User.query.get(user_id)
    except:
        return None
