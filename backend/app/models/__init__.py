"""
Models Package
SQLAlchemy ORM Models
"""
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

# Import models for Alembic autodiscovery
from app.models.user import User
from app.models.credential import WebAuthnCredential
from app.models.audit import AuditLog
from app.models.session import Session

__all__ = ['db', 'User', 'WebAuthnCredential', 'AuditLog', 'Session']
