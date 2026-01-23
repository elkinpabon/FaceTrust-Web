"""
Audit Controller
Audit log endpoints (Admin only)
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime

from app.services.audit_service import AuditService
from app.middleware.rbac_middleware import require_admin

audit_bp = Blueprint('audit', __name__)


@audit_bp.route('/logs', methods=['GET'])
@jwt_required()
@require_admin()
def get_logs():
    """Get audit logs with filters (Admin only)"""
    admin_id = get_jwt_identity()
    
    # Build filters
    filters = {}
    
    if request.args.get('user_id'):
        filters['user_id'] = int(request.args.get('user_id'))
    
    if request.args.get('action'):
        filters['action'] = request.args.get('action')
    
    if request.args.get('success'):
        filters['success'] = request.args.get('success').lower() == 'true'
    
    if request.args.get('date_from'):
        try:
            filters['date_from'] = datetime.fromisoformat(request.args.get('date_from'))
        except ValueError:
            return jsonify({'error': 'Invalid date_from format', 'code': 'invalid_date'}), 400
    
    if request.args.get('date_to'):
        try:
            filters['date_to'] = datetime.fromisoformat(request.args.get('date_to'))
        except ValueError:
            return jsonify({'error': 'Invalid date_to format', 'code': 'invalid_date'}), 400
    
    limit = request.args.get('limit', 100, type=int)
    offset = request.args.get('offset', 0, type=int)
    
    # Validate limits
    if limit > 1000:
        limit = 1000
    if offset < 0:
        offset = 0
    
    logs = AuditService.search_audit_logs(filters, limit, offset)
    
    # Log audit access
    AuditService.log_audit_access(admin_id, filters)
    
    return jsonify({
        'logs': logs,
        'total': len(logs),
        'limit': limit,
        'offset': offset
    }), 200


@audit_bp.route('/summary', methods=['GET'])
@jwt_required()
@require_admin()
def get_summary():
    """Get security summary (Admin only)"""
    admin_id = get_jwt_identity()
    days = request.args.get('days', 7, type=int)
    
    # Validate days
    if days < 1:
        days = 1
    if days > 365:
        days = 365
    
    summary = AuditService.get_security_summary(admin_id=None, days=days)
    
    # Log summary access
    AuditService.log_audit_access(admin_id, {'summary': True, 'days': days})
    
    return jsonify(summary), 200


@audit_bp.route('/user/<int:user_id>', methods=['GET'])
@jwt_required()
@require_admin()
def get_user_logs(user_id):
    """Get logs for specific user (Admin only)"""
    limit = request.args.get('limit', 100, type=int)
    offset = request.args.get('offset', 0, type=int)
    
    # Validate limits
    if limit > 1000:
        limit = 1000
    if offset < 0:
        offset = 0
    
    logs = AuditService.get_user_audit_logs(user_id, limit, offset)
    
    return jsonify({
        'user_id': user_id,
        'logs': logs,
        'total': len(logs),
        'limit': limit,
        'offset': offset
    }), 200


@audit_bp.route('/actions', methods=['GET'])
@jwt_required()
@require_admin()
def get_action_types():
    """Get list of all action types (Admin only)"""
    
    # Predefined list of action types
    actions = [
        'user.register.attempt',
        'user.register.success',
        'user.register.failed',
        'user.login.attempt',
        'user.login.success',
        'user.login.failed',
        'user.logout',
        'user.logout.all',
        'user.update.profile',
        'user.update.role',
        'user.deactivate',
        'user.reactivate',
        'webauthn.credential.added',
        'webauthn.credential.removed',
        'auth.otp.generated',
        'auth.otp.success',
        'auth.otp.failed',
        'admin.audit.view',
        'rate_limit.triggered'
    ]
    
    return jsonify({
        'actions': actions,
        'total': len(actions)
    }), 200


@audit_bp.route('/export', methods=['GET'])
@jwt_required()
@require_admin()
def export_logs():
    """
    Export audit logs as CSV (Admin only)
    
    Note: Implement with pandas or csv module in production
    """
    admin_id = get_jwt_identity()
    
    # TODO: Implement CSV export
    # For now, return JSON with hint
    
    return jsonify({
        'message': 'CSV export not yet implemented',
        'hint': 'Use /api/audit/logs with large limit and process client-side'
    }), 501
