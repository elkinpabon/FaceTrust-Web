"""
User Service
Business logic for user management
"""
from typing import Dict, List, Optional
from flask import current_app

from app.models import db
from app.models.user import User, UserRole
from app.services.audit_service import AuditService


class UserService:
    """
    User Service
    
    Maneja operaciones CRUD de usuarios con control RBAC.
    """
    
    @staticmethod
    def create_user(email: str, name: str, role: str = 'client') -> User:
        """
        Create new user
        
        Args:
            email: User email (unique)
            name: User full name
            role: User role ('admin' or 'client')
        
        Returns:
            Created User instance
        
        Raises:
            ValueError: If email already exists or invalid role
        """
        # Validate email uniqueness
        if User.get_by_email(email):
            raise ValueError('Email already registered')
        
        # Validate role
        try:
            user_role = UserRole(role)
        except ValueError:
            raise ValueError('Invalid role')
        
        # Create user
        user = User(
            email=email.lower(),
            name=name,
            role=user_role,
            is_active=True
        )
        
        db.session.add(user)
        db.session.commit()
        
        # Log creation
        AuditService.log_registration(email, success=True)
        
        return user
    
    @staticmethod
    def get_user(user_id: int) -> Optional[User]:
        """Get user by ID"""
        return User.query.get(user_id)
    
    @staticmethod
    def get_user_by_email(email: str) -> Optional[User]:
        """Get user by email"""
        return User.get_by_email(email)
    
    @staticmethod
    def update_user(user_id: int, updates: Dict, updated_by_id: int) -> User:
        """
        Update user data
        
        Args:
            user_id: User ID to update
            updates: Dictionary with fields to update
            updated_by_id: ID of user performing update
        
        Returns:
            Updated User instance
        
        Raises:
            ValueError: If user not found or unauthorized
        """
        user = User.query.get(user_id)
        if not user:
            raise ValueError('User not found')
        
        updated_by = User.query.get(updated_by_id)
        if not updated_by:
            raise ValueError('Updater not found')
        
        # Check permissions
        if not updated_by.can_access_user(user_id):
            raise ValueError('Unauthorized to update this user')
        
        changed_fields = []
        
        # Update allowed fields
        if 'name' in updates and user.name != updates['name']:
            user.name = updates['name']
            changed_fields.append('name')
        
        if 'email' in updates and user.email != updates['email'].lower():
            # Check email uniqueness
            existing = User.get_by_email(updates['email'])
            if existing and existing.id != user_id:
                raise ValueError('Email already in use')
            
            user.email = updates['email'].lower()
            changed_fields.append('email')
        
        # Only admins can update roles
        if 'role' in updates:
            if updated_by.role != UserRole.ADMIN:
                raise ValueError('Only admins can change roles')
            
            new_role = UserRole(updates['role'])
            if user.role != new_role:
                old_role = user.role.value
                user.role = new_role
                changed_fields.append('role')
                
                # Log role change
                AuditService.log_role_change(
                    admin_id=updated_by_id,
                    target_user_id=user_id,
                    old_role=old_role,
                    new_role=new_role.value
                )
        
        if changed_fields:
            db.session.commit()
            
            # Log update
            AuditService.log_user_update(user_id, changed_fields)
        
        return user
    
    @staticmethod
    def deactivate_user(user_id: int, admin_id: int) -> User:
        """
        Deactivate user (soft delete)
        
        Args:
            user_id: User ID to deactivate
            admin_id: Admin user ID performing action
        
        Returns:
            Deactivated User instance
        
        Raises:
            ValueError: If user not found or unauthorized
        """
        admin = User.query.get(admin_id)
        if not admin or admin.role != UserRole.ADMIN:
            raise ValueError('Only admins can deactivate users')
        
        user = User.query.get(user_id)
        if not user:
            raise ValueError('User not found')
        
        # Prevent self-deactivation
        if user_id == admin_id:
            raise ValueError('Cannot deactivate yourself')
        
        user.is_active = False
        db.session.commit()
        
        # Log deactivation
        AuditService.log_user_deactivation(admin_id, user_id)
        
        # Revoke all sessions
        from app.services.auth_service import AuthService
        AuthService.logout_all_sessions(user_id)
        
        return user
    
    @staticmethod
    def reactivate_user(user_id: int, admin_id: int) -> User:
        """
        Reactivate deactivated user
        
        Args:
            user_id: User ID to reactivate
            admin_id: Admin user ID performing action
        
        Returns:
            Reactivated User instance
        
        Raises:
            ValueError: If user not found or unauthorized
        """
        admin = User.query.get(admin_id)
        if not admin or admin.role != UserRole.ADMIN:
            raise ValueError('Only admins can reactivate users')
        
        user = User.query.get(user_id)
        if not user:
            raise ValueError('User not found')
        
        user.is_active = True
        db.session.commit()
        
        # Log reactivation
        AuditService.log_action(
            action='user.reactivate',
            user_id=admin_id,
            resource=f'user:{user_id}',
            success=True
        )
        
        return user
    
    @staticmethod
    def get_all_users(admin_id: int, filters: Optional[Dict] = None) -> List[User]:
        """
        Get all users (admin only)
        
        Args:
            admin_id: Admin user ID
            filters: Optional filters (role, is_active, search)
        
        Returns:
            List of users
        
        Raises:
            ValueError: If unauthorized
        """
        admin = User.query.get(admin_id)
        if not admin or admin.role != UserRole.ADMIN:
            raise ValueError('Only admins can list all users')
        
        query = User.query
        
        if filters:
            if 'role' in filters:
                query = query.filter_by(role=UserRole(filters['role']))
            
            if 'is_active' in filters:
                query = query.filter_by(is_active=filters['is_active'])
            
            if 'search' in filters:
                search_term = f"%{filters['search']}%"
                query = query.filter(
                    db.or_(
                        User.email.like(search_term),
                        User.name.like(search_term)
                    )
                )
        
        return query.order_by(User.created_at.desc()).all()
    
    @staticmethod
    def get_user_stats(admin_id: int) -> Dict:
        """
        Get user statistics (admin only)
        
        Args:
            admin_id: Admin user ID
        
        Returns:
            Dictionary with statistics
        
        Raises:
            ValueError: If unauthorized
        """
        admin = User.query.get(admin_id)
        if not admin or admin.role != UserRole.ADMIN:
            raise ValueError('Only admins can view statistics')
        
        total_users = User.query.count()
        active_users = User.query.filter_by(is_active=True).count()
        admin_users = User.query.filter_by(role=UserRole.ADMIN).count()
        client_users = User.query.filter_by(role=UserRole.CLIENT).count()
        
        return {
            'total_users': total_users,
            'active_users': active_users,
            'inactive_users': total_users - active_users,
            'admin_users': admin_users,
            'client_users': client_users
        }
