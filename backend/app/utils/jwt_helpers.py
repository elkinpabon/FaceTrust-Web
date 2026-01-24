"""
JWT Helper Functions
Utilities for working with JWT tokens
"""
from flask_jwt_extended import get_jwt_identity as _get_jwt_identity


def get_current_user_id():
    """
    Get current user ID from JWT token as integer
    
    Flask-JWT-Extended returns identity as string, this converts to int
    
    Returns:
        int: Current user's ID
    """
    return int(_get_jwt_identity())
