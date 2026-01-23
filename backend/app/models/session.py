"""
Session Model
Tracks active JWT sessions for revocation capability
"""
from datetime import datetime
from app.models import db
import hashlib


class Session(db.Model):
    """
    Session Model
    
    Almacena hash de tokens JWT activos para permitir revocación.
    NO almacena el token completo (seguridad).
    """
    __tablename__ = 'sessions'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Token Hash (SHA-256 of JTI)
    token_hash = db.Column(db.String(64), unique=True, nullable=False, index=True)
    
    # Session Metadata
    ip_address = db.Column(db.String(45), nullable=True)
    user_agent = db.Column(db.Text, nullable=True)
    
    # Expiration
    expires_at = db.Column(db.DateTime, nullable=False, index=True)
    
    # Revocation
    is_revoked = db.Column(db.Boolean, default=False, nullable=False, index=True)
    revoked_at = db.Column(db.DateTime, nullable=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    user = db.relationship('User', back_populates='sessions')
    
    def __repr__(self):
        return f'<Session {self.token_hash[:10]}... for User {self.user_id}>'
    
    def to_dict(self):
        """Convert session to dictionary"""
        return {
            'id': self.id,
            'ip_address': self.ip_address,
            'user_agent': self.user_agent,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'is_revoked': self.is_revoked,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def revoke(self):
        """Revoke this session"""
        self.is_revoked = True
        self.revoked_at = datetime.utcnow()
        db.session.commit()
    
    @staticmethod
    def hash_token(jti):
        """
        Create SHA-256 hash of JWT ID (JTI)
        
        Args:
            jti: JWT ID from token payload
        
        Returns:
            Hexadecimal hash string
        """
        return hashlib.sha256(jti.encode()).hexdigest()
    
    @staticmethod
    def create_session(user_id, jti, expires_at, ip_address=None, user_agent=None):
        """
        Create a new session
        
        Args:
            user_id: User ID
            jti: JWT ID
            expires_at: Expiration datetime
            ip_address: Client IP
            user_agent: Client User-Agent
        
        Returns:
            Created Session instance
        """
        token_hash = Session.hash_token(jti)
        
        session = Session(
            user_id=user_id,
            token_hash=token_hash,
            expires_at=expires_at,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        db.session.add(session)
        db.session.commit()
        
        return session
    
    @staticmethod
    def is_token_revoked(jti):
        """
        Check if a token is revoked
        
        Args:
            jti: JWT ID
        
        Returns:
            Boolean indicating revocation status
        """
        token_hash = Session.hash_token(jti)
        
        session = Session.query.filter_by(token_hash=token_hash).first()
        
        if not session:
            # Token doesn't exist in database - consider it revoked
            return True
        
        # Check if expired
        if session.expires_at < datetime.utcnow():
            return True
        
        return session.is_revoked
    
    @staticmethod
    def revoke_user_sessions(user_id):
        """
        Revoke all sessions for a user
        
        Args:
            user_id: User ID
        
        Returns:
            Number of revoked sessions
        """
        sessions = Session.query.filter_by(user_id=user_id, is_revoked=False).all()
        
        count = 0
        for session in sessions:
            session.revoke()
            count += 1
        
        return count
    
    @staticmethod
    def cleanup_expired_sessions():
        """
        Remove expired sessions from database
        
        Returns:
            Number of deleted sessions
        """
        deleted = Session.query.filter(Session.expires_at < datetime.utcnow()).delete()
        db.session.commit()
        
        return deleted
    
    @staticmethod
    def get_active_sessions(user_id):
        """Get all active (non-revoked, non-expired) sessions for a user"""
        return Session.query.filter(
            Session.user_id == user_id,
            Session.is_revoked == False,
            Session.expires_at > datetime.utcnow()
        ).all()
