"""
WebAuthn Credential Model
Stores public keys and metadata for WebAuthn authentication
NO almacena datos biométricos - solo claves públicas
"""
from datetime import datetime
from app.models import db


class WebAuthnCredential(db.Model):
    """
    WebAuthn Credential Model
    
    Almacena ÚNICAMENTE:
    - credential_id: Identificador único de la credencial
    - public_key: Clave pública (NO privada, NO biometría)
    - sign_count: Contador de firmas (seguridad anti-clonación)
    - transports: Métodos de transporte (USB, NFC, BLE, internal)
    
    NO almacena ni almacenará jamás:
    - Fotos, videos o capturas de rostro
    - Embeddings faciales
    - Plantillas biométricas
    - Huellas dactilares
    """
    __tablename__ = 'webauthn_credentials'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # WebAuthn Core Fields
    credential_id = db.Column(db.String(512), unique=True, nullable=False, index=True)
    public_key = db.Column(db.Text, nullable=False)  # COSE key in base64
    
    # Security Fields
    sign_count = db.Column(db.Integer, default=0, nullable=False)
    aaguid = db.Column(db.String(36), nullable=True)  # Authenticator AAGUID
    
    # Metadata
    transports = db.Column(db.JSON, nullable=True)  # ['internal', 'usb', 'nfc', 'ble']
    device_type = db.Column(db.String(50), nullable=True)  # 'platform' or 'cross-platform'
    backup_eligible = db.Column(db.Boolean, default=False)
    backup_state = db.Column(db.Boolean, default=False)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    last_used_at = db.Column(db.DateTime, nullable=True)
    
    # Relationships
    user = db.relationship('User', back_populates='credentials')
    
    def __repr__(self):
        return f'<WebAuthnCredential {self.credential_id[:20]}... for User {self.user_id}>'
    
    def to_dict(self):
        """Convert credential to dictionary"""
        return {
            'id': self.id,
            'credential_id': self.credential_id,
            'transports': self.transports,
            'device_type': self.device_type,
            'backup_eligible': self.backup_eligible,
            'sign_count': self.sign_count,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_used_at': self.last_used_at.isoformat() if self.last_used_at else None
        }
    
    def update_sign_count(self, new_count):
        """
        Update sign count after successful authentication
        
        Args:
            new_count: New sign count from authenticator
        
        Raises:
            ValueError: If new count is less than current (potential cloning attack)
        """
        if new_count > 0 and new_count <= self.sign_count:
            raise ValueError('Sign count did not increase - possible credential cloning attack')
        
        self.sign_count = new_count
        self.last_used_at = datetime.utcnow()
        db.session.commit()
    
    @staticmethod
    def get_by_credential_id(credential_id):
        """Get credential by credential_id"""
        return WebAuthnCredential.query.filter_by(credential_id=credential_id).first()
    
    @staticmethod
    def get_user_credentials(user_id):
        """Get all credentials for a user"""
        return WebAuthnCredential.query.filter_by(user_id=user_id).all()
    
    @staticmethod
    def delete_credential(credential_id, user_id):
        """
        Delete a credential (requires user ownership verification)
        
        Args:
            credential_id: Credential ID to delete
            user_id: User ID for ownership verification
        
        Returns:
            Boolean indicating success
        """
        credential = WebAuthnCredential.query.filter_by(
            credential_id=credential_id,
            user_id=user_id
        ).first()
        
        if credential:
            db.session.delete(credential)
            db.session.commit()
            return True
        
        return False
