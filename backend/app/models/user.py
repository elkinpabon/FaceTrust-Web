"""
User Model
Represents application users with role-based access
"""
from datetime import datetime
from enum import Enum
from app.models import db


class UserRole(str, Enum):
    """User role enumeration"""
    ADMIN = 'admin'
    CLIENT = 'client'


class User(db.Model):
    """
    User Model
    
    NO almacena contraseñas ni datos biométricos.
    La autenticación es 100% mediante WebAuthn.
    """
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False)
    role = db.Column(db.Enum(UserRole), nullable=False, default=UserRole.CLIENT, index=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    credentials = db.relationship('WebAuthnCredential', back_populates='user', cascade='all, delete-orphan', lazy='dynamic')
    audit_logs = db.relationship('AuditLog', back_populates='user', lazy='dynamic')
    sessions = db.relationship('Session', back_populates='user', cascade='all, delete-orphan', lazy='dynamic')
    
    def __repr__(self):
        return f'<User {self.email} ({self.role.value})>'
    
    def to_dict(self, include_sensitive=False):
        """
        Convert user to dictionary
        
        Args:
            include_sensitive: Include sensitive fields (only for admin)
        
        Returns:
            Dictionary representation
        """
        data = {
            'id': self.id,
            'email': self.email,
            'name': self.name,
            'role': self.role.value,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        
        if include_sensitive:
            data['credentials_count'] = self.credentials.count()
        
        return data
    
    def has_permission(self, permission):
        """
        Check if user has specific permission
        
        Args:
            permission: Permission string
        
        Returns:
            Boolean indicating permission status
        """
        permissions_map = {
            UserRole.ADMIN: [
                'users.create',
                'users.read',
                'users.update',
                'users.deactivate',
                'users.manage_roles',
                'audit.read',
                'audit.export'
            ],
            UserRole.CLIENT: [
                'profile.read',
                'profile.update'
            ]
        }
        
        return permission in permissions_map.get(self.role, [])
    
    def can_access_user(self, target_user_id):
        """
        Check if user can access another user's data
        
        Args:
            target_user_id: ID of target user
        
        Returns:
            Boolean indicating access permission
        """
        if self.role == UserRole.ADMIN:
            return True
        
        return self.id == target_user_id
    
    @staticmethod
    def get_by_email(email):
        """Get user by email"""
        return User.query.filter_by(email=email.lower()).first()
    
    @staticmethod
    def get_active_users(role=None):
        """Get all active users, optionally filtered by role"""
        query = User.query.filter_by(is_active=True)
        
        if role:
            query = query.filter_by(role=role)
        
        return query.all()
