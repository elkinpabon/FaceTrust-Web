"""
Audit Log Model
Immutable audit trail for security and compliance
"""
from datetime import datetime
from app.models import db


class AuditLog(db.Model):
    """
    Audit Log Model
    
    Registra TODOS los eventos de seguridad:
    - Intentos de login (exitosos y fallidos)
    - Cambios en usuarios y roles
    - Accesos a datos sensibles
    - Violaciones de rate limiting
    - Cambios en credenciales WebAuthn
    
    Los logs son INMUTABLES - no se pueden editar ni eliminar.
    """
    __tablename__ = 'audit_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    
    # Action Information
    action = db.Column(db.String(100), nullable=False, index=True)  # 'user.login.success', 'user.update.role', etc.
    resource = db.Column(db.String(255), nullable=True)  # Resource affected (user ID, credential ID, etc.)
    
    # Request Context
    ip_address = db.Column(db.String(45), nullable=True)  # IPv4 or IPv6
    user_agent = db.Column(db.Text, nullable=True)
    
    # Result
    success = db.Column(db.Boolean, nullable=False, index=True)
    
    # Additional Details (JSON)
    details = db.Column(db.JSON, nullable=True)  # Extra context (error messages, changed fields, etc.)
    
    # Timestamp (indexed for efficient queries)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Relationships
    user = db.relationship('User', back_populates='audit_logs')
    
    def __repr__(self):
        return f'<AuditLog {self.action} by User {self.user_id} at {self.created_at}>'
    
    def to_dict(self):
        """Convert audit log to dictionary"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'user_email': self.user.email if self.user else None,
            'action': self.action,
            'resource': self.resource,
            'ip_address': self.ip_address,
            'user_agent': self.user_agent,
            'success': self.success,
            'details': self.details,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    @staticmethod
    def log_action(action, user_id=None, resource=None, ip_address=None, 
                   user_agent=None, success=True, details=None):
        """
        Create an immutable audit log entry
        
        Args:
            action: Action identifier (e.g., 'user.login.success')
            user_id: User who performed the action (None for anonymous)
            resource: Resource affected (optional)
            ip_address: Client IP address
            user_agent: Client User-Agent
            success: Whether action succeeded
            details: Additional context (dict)
        
        Returns:
            Created AuditLog instance
        """
        log = AuditLog(
            user_id=user_id,
            action=action,
            resource=resource,
            ip_address=ip_address,
            user_agent=user_agent,
            success=success,
            details=details
        )
        
        db.session.add(log)
        db.session.commit()
        
        return log
    
    @staticmethod
    def get_user_logs(user_id, limit=100, offset=0):
        """Get audit logs for a specific user"""
        return AuditLog.query.filter_by(user_id=user_id)\
            .order_by(AuditLog.created_at.desc())\
            .limit(limit)\
            .offset(offset)\
            .all()
    
    @staticmethod
    def get_failed_login_attempts(email, since_datetime):
        """
        Get failed login attempts for an email since a specific time
        
        Args:
            email: User email
            since_datetime: Start datetime for search
        
        Returns:
            Count of failed attempts
        """
        from app.models.user import User
        
        user = User.get_by_email(email)
        if not user:
            return 0
        
        return AuditLog.query.filter(
            AuditLog.user_id == user.id,
            AuditLog.action.in_(['user.login.failed', 'user.login.attempt']),
            AuditLog.success == False,
            AuditLog.created_at >= since_datetime
        ).count()
    
    @staticmethod
    def search_logs(filters=None, limit=100, offset=0):
        """
        Search audit logs with filters
        
        Args:
            filters: Dictionary with filter criteria
                - user_id: Filter by user
                - action: Filter by action (supports LIKE)
                - success: Filter by success status
                - date_from: Filter from date
                - date_to: Filter to date
            limit: Maximum results
            offset: Pagination offset
        
        Returns:
            List of matching AuditLog instances
        """
        query = AuditLog.query
        
        if filters:
            if 'user_id' in filters:
                query = query.filter_by(user_id=filters['user_id'])
            
            if 'action' in filters:
                query = query.filter(AuditLog.action.like(f"%{filters['action']}%"))
            
            if 'success' in filters:
                query = query.filter_by(success=filters['success'])
            
            if 'date_from' in filters:
                query = query.filter(AuditLog.created_at >= filters['date_from'])
            
            if 'date_to' in filters:
                query = query.filter(AuditLog.created_at <= filters['date_to'])
        
        return query.order_by(AuditLog.created_at.desc())\
            .limit(limit)\
            .offset(offset)\
            .all()
