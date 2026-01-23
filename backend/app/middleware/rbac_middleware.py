"""
RBAC Middleware
Role-Based Access Control decorators
"""
from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity

from app.models.user import User, UserRole


def require_role(*allowed_roles):
    """
    Decorator to require specific roles
    
    Args:
        *allowed_roles: Variable number of allowed UserRole values
    
    Example:
        @require_role(UserRole.ADMIN)
        def admin_only_endpoint():
            pass
    """
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            # Get current user
            user_id = get_jwt_identity()
            user = User.query.get(user_id)
            
            if not user or not user.is_active:
                return jsonify({
                    'error': 'User not found or inactive',
                    'code': 'user_inactive'
                }), 401
            
            # Check role
            if user.role not in allowed_roles:
                return jsonify({
                    'error': 'Insufficient permissions',
                    'code': 'forbidden',
                    'required_roles': [role.value for role in allowed_roles]
                }), 403
            
            return fn(*args, **kwargs)
        
        return decorator
    return wrapper


def require_admin():
    """Decorator to require admin role"""
    return require_role(UserRole.ADMIN)


def require_permission(permission: str):
    """
    Decorator to require specific permission
    
    Args:
        permission: Permission string (e.g., 'users.create')
    
    Example:
        @require_permission('users.create')
        def create_user():
            pass
    """
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            # Get current user
            user_id = get_jwt_identity()
            user = User.query.get(user_id)
            
            if not user or not user.is_active:
                return jsonify({
                    'error': 'User not found or inactive',
                    'code': 'user_inactive'
                }), 401
            
            # Check permission
            if not user.has_permission(permission):
                return jsonify({
                    'error': f'Permission denied: {permission}',
                    'code': 'forbidden'
                }), 403
            
            return fn(*args, **kwargs)
        
        return decorator
    return wrapper


def require_self_or_admin(user_id_param='user_id'):
    """
    Decorator to require user to be accessing their own data or be an admin
    
    Args:
        user_id_param: Name of the parameter containing target user ID
    
    Example:
        @require_self_or_admin('id')
        def get_user(id):
            pass
    """
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            # Get current user
            current_user_id = get_jwt_identity()
            current_user = User.query.get(current_user_id)
            
            if not current_user or not current_user.is_active:
                return jsonify({
                    'error': 'User not found or inactive',
                    'code': 'user_inactive'
                }), 401
            
            # Get target user ID from kwargs
            target_user_id = kwargs.get(user_id_param)
            
            # Allow if admin or accessing own data
            if current_user.role == UserRole.ADMIN or current_user_id == target_user_id:
                return fn(*args, **kwargs)
            
            return jsonify({
                'error': 'Insufficient permissions',
                'code': 'forbidden'
            }), 403
        
        return decorator
    return wrapper
