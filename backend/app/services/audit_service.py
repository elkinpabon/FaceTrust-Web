"""
Audit Service
Centralized logging for security and compliance
"""
from datetime import datetime
from typing import Optional, Dict
from flask import request

from app.models.audit import AuditLog


class AuditService:
    """
    Audit Service
    
    Registra TODOS los eventos de seguridad de forma inmutable.
    Proporciona funciones helper para logging consistente.
    """
    
    @staticmethod
    def log_action(action: str, user_id: Optional[int] = None, 
                   resource: Optional[str] = None, success: bool = True,
                   details: Optional[Dict] = None):
        """
        Log an audit event
        
        Args:
            action: Action identifier (e.g., 'user.login.success')
            user_id: User who performed the action
            resource: Affected resource
            success: Whether action succeeded
            details: Additional context
        """
        # Get request context
        ip_address = request.remote_addr if request else None
        user_agent = request.headers.get('User-Agent') if request else None
        
        # Create audit log
        AuditLog.log_action(
            action=action,
            user_id=user_id,
            resource=resource,
            ip_address=ip_address,
            user_agent=user_agent,
            success=success,
            details=details
        )
    
    # ==================== HELPER METHODS ====================
    
    @staticmethod
    def log_login_attempt(email: str, success: bool, reason: Optional[str] = None):
        """Log login attempt"""
        from app.models.user import User
        user = User.get_by_email(email)
        
        action = 'user.login.success' if success else 'user.login.failed'
        details = {'email': email}
        
        if reason:
            details['reason'] = reason
        
        AuditService.log_action(
            action=action,
            user_id=user.id if user else None,
            success=success,
            details=details
        )
    
    @staticmethod
    def log_registration(email: str, success: bool, reason: Optional[str] = None):
        """Log registration attempt"""
        action = 'user.register.success' if success else 'user.register.failed'
        details = {'email': email}
        
        if reason:
            details['reason'] = reason
        
        AuditService.log_action(
            action=action,
            success=success,
            details=details
        )
    
    @staticmethod
    def log_user_update(user_id: int, changed_fields: list):
        """Log user profile update"""
        AuditService.log_action(
            action='user.update.profile',
            user_id=user_id,
            resource=f'user:{user_id}',
            success=True,
            details={'changed_fields': changed_fields}
        )
    
    @staticmethod
    def log_role_change(admin_id: int, target_user_id: int, old_role: str, new_role: str):
        """Log role change by admin"""
        AuditService.log_action(
            action='user.update.role',
            user_id=admin_id,
            resource=f'user:{target_user_id}',
            success=True,
            details={
                'old_role': old_role,
                'new_role': new_role,
                'target_user_id': target_user_id
            }
        )
    
    @staticmethod
    def log_user_deactivation(admin_id: int, target_user_id: int):
        """Log user deactivation"""
        AuditService.log_action(
            action='user.deactivate',
            user_id=admin_id,
            resource=f'user:{target_user_id}',
            success=True,
            details={'target_user_id': target_user_id}
        )
    
    @staticmethod
    def log_credential_added(user_id: int, credential_id: str):
        """Log WebAuthn credential addition"""
        AuditService.log_action(
            action='webauthn.credential.added',
            user_id=user_id,
            resource=f'credential:{credential_id[:20]}',
            success=True
        )
    
    @staticmethod
    def log_credential_removed(user_id: int, credential_id: str):
        """Log WebAuthn credential removal"""
        AuditService.log_action(
            action='webauthn.credential.removed',
            user_id=user_id,
            resource=f'credential:{credential_id[:20]}',
            success=True
        )
    
    @staticmethod
    def log_rate_limit_triggered(user_id: Optional[int], action: str):
        """Log rate limiting trigger"""
        AuditService.log_action(
            action='rate_limit.triggered',
            user_id=user_id,
            success=False,
            details={'blocked_action': action}
        )
    
    @staticmethod
    def log_audit_access(admin_id: int, filters: Optional[Dict] = None):
        """Log audit log access by admin"""
        AuditService.log_action(
            action='admin.audit.view',
            user_id=admin_id,
            success=True,
            details={'filters': filters} if filters else None
        )
    
    # ==================== QUERY METHODS ====================
    
    @staticmethod
    def get_user_audit_logs(user_id: int, limit: int = 100, offset: int = 0):
        """
        Get audit logs for specific user
        
        Args:
            user_id: User ID
            limit: Maximum results
            offset: Pagination offset
        
        Returns:
            List of audit logs
        """
        logs = AuditLog.get_user_logs(user_id, limit, offset)
        return [log.to_dict() for log in logs]
    
    @staticmethod
    def get_failed_login_attempts(email: str, since_minutes: int = 15):
        """
        Get count of failed login attempts for email
        
        Args:
            email: User email
            since_minutes: Time window in minutes
        
        Returns:
            Count of failed attempts
        """
        since_datetime = datetime.utcnow() - timedelta(minutes=since_minutes)
        return AuditLog.get_failed_login_attempts(email, since_datetime)
    
    @staticmethod
    def search_audit_logs(filters: Optional[Dict] = None, limit: int = 100, offset: int = 0):
        """
        Search audit logs with filters
        
        Args:
            filters: Filter criteria
            limit: Maximum results
            offset: Pagination offset
        
        Returns:
            List of audit logs
        """
        logs = AuditLog.search_logs(filters, limit, offset)
        return [log.to_dict() for log in logs]
    
    @staticmethod
    def get_security_summary(user_id: Optional[int] = None, days: int = 7):
        """
        Get security summary for user or entire system
        
        Args:
            user_id: User ID (None for system-wide)
            days: Number of days to analyze
        
        Returns:
            Dictionary with security metrics
        """
        from datetime import timedelta
        
        since_datetime = datetime.utcnow() - timedelta(days=days)
        
        filters = {'date_from': since_datetime}
        if user_id:
            filters['user_id'] = user_id
        
        all_logs = AuditLog.search_logs(filters, limit=10000)
        
        # Calculate metrics
        total_events = len(all_logs)
        failed_logins = len([log for log in all_logs if log.action == 'user.login.failed'])
        successful_logins = len([log for log in all_logs if log.action == 'user.login.success'])
        rate_limit_triggers = len([log for log in all_logs if log.action == 'rate_limit.triggered'])
        
        return {
            'period_days': days,
            'total_events': total_events,
            'successful_logins': successful_logins,
            'failed_logins': failed_logins,
            'rate_limit_triggers': rate_limit_triggers,
            'user_id': user_id
        }


from datetime import timedelta
