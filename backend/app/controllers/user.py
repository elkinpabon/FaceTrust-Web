"""
User Controller
User management endpoints (RBAC protected)
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.services.user_service import UserService
from app.middleware.rbac_middleware import require_admin, require_self_or_admin

user_bp = Blueprint('users', __name__)


@user_bp.route('', methods=['GET'])
@jwt_required()
@require_admin()
def get_all_users():
    """Get all users (Admin only)"""
    admin_id = get_jwt_identity()
    
    filters = {
        'role': request.args.get('role'),
        'is_active': request.args.get('is_active'),
        'search': request.args.get('search')
    }
    
    # Remove None values
    filters = {k: v for k, v in filters.items() if v is not None}
    
    try:
        users = UserService.get_all_users(admin_id, filters)
        
        return jsonify({
            'users': [user.to_dict() for user in users],
            'total': len(users)
        }), 200
    except ValueError as e:
        return jsonify({'error': str(e), 'code': 'forbidden'}), 403


@user_bp.route('/<int:user_id>', methods=['GET'])
@jwt_required()
@require_self_or_admin('user_id')
def get_user(user_id):
    """Get user by ID (Admin or own data)"""
    user = UserService.get_user(user_id)
    
    if not user:
        return jsonify({'error': 'User not found', 'code': 'not_found'}), 404
    
    # Include sensitive data if admin
    current_user_id = get_jwt_identity()
    current_user = UserService.get_user(current_user_id)
    
    from app.models.user import UserRole
    include_sensitive = current_user.role == UserRole.ADMIN
    
    return jsonify(user.to_dict(include_sensitive=include_sensitive)), 200


@user_bp.route('/<int:user_id>', methods=['PUT'])
@jwt_required()
@require_self_or_admin('user_id')
def update_user(user_id):
    """Update user (Admin or own data)"""
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided', 'code': 'missing_data'}), 400
    
    current_user_id = get_jwt_identity()
    
    try:
        user = UserService.update_user(user_id, data, current_user_id)
        return jsonify({
            'success': True,
            'user': user.to_dict()
        }), 200
    except ValueError as e:
        return jsonify({'error': str(e), 'code': 'update_failed'}), 400


@user_bp.route('/<int:user_id>/deactivate', methods=['POST'])
@jwt_required()
@require_admin()
def deactivate_user(user_id):
    """Deactivate user (Admin only)"""
    admin_id = get_jwt_identity()
    
    try:
        UserService.deactivate_user(user_id, admin_id)
        return jsonify({
            'success': True,
            'message': 'User deactivated successfully'
        }), 200
    except ValueError as e:
        return jsonify({'error': str(e), 'code': 'deactivate_failed'}), 400


@user_bp.route('/<int:user_id>/reactivate', methods=['POST'])
@jwt_required()
@require_admin()
def reactivate_user(user_id):
    """Reactivate user (Admin only)"""
    admin_id = get_jwt_identity()
    
    try:
        UserService.reactivate_user(user_id, admin_id)
        return jsonify({
            'success': True,
            'message': 'User reactivated successfully'
        }), 200
    except ValueError as e:
        return jsonify({'error': str(e), 'code': 'reactivate_failed'}), 400


@user_bp.route('/stats', methods=['GET'])
@jwt_required()
@require_admin()
def get_stats():
    """Get user statistics (Admin only)"""
    admin_id = get_jwt_identity()
    
    try:
        stats = UserService.get_user_stats(admin_id)
        return jsonify(stats), 200
    except ValueError as e:
        return jsonify({'error': str(e), 'code': 'forbidden'}), 403


@user_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Get current authenticated user"""
    user_id = get_jwt_identity()
    user = UserService.get_user(user_id)
    
    if not user:
        return jsonify({'error': 'User not found', 'code': 'not_found'}), 404
    
    return jsonify(user.to_dict()), 200


@user_bp.route('/me/sessions', methods=['GET'])
@jwt_required()
def get_my_sessions():
    """Get current user's active sessions"""
    user_id = get_jwt_identity()
    
    from app.services.auth_service import AuthService
    sessions = AuthService.get_active_sessions(user_id)
    
    return jsonify({
        'sessions': [session.to_dict() for session in sessions],
        'total': len(sessions)
    }), 200
