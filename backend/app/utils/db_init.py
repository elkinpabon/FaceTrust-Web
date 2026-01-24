"""
Database initialization utilities.
Auto-creates tables on first run, validates on subsequent runs.
"""
import sys
from pathlib import Path
from typing import Optional

from flask import Flask
from alembic import command
from alembic.config import Config as AlembicConfig
from alembic.script import ScriptDirectory
from alembic.runtime.migration import MigrationContext
from sqlalchemy import inspect

from app.models import db
from app.models.user import User, UserRole


def get_alembic_config(app: Flask) -> AlembicConfig:
    """Get Alembic configuration."""
    backend_dir = Path(__file__).parent.parent.parent
    alembic_ini = backend_dir / 'alembic.ini'
    
    if not alembic_ini.exists():
        raise FileNotFoundError(f"alembic.ini not found at {alembic_ini}")
    
    cfg = AlembicConfig(str(alembic_ini))
    cfg.set_main_option('script_location', str(backend_dir / 'migrations'))
    cfg.set_main_option('sqlalchemy.url', app.config['SQLALCHEMY_DATABASE_URI'])
    cfg.attributes['configure_logger'] = False
    
    return cfg


def get_current_revision(app: Flask) -> Optional[str]:
    """
    Get the current database revision.
    
    Args:
        app: Flask application instance
        
    Returns:
        Current revision or None if not versioned
    """
    with app.app_context():
        with db.engine.connect() as connection:
            context = MigrationContext.configure(connection)
            return context.get_current_revision()


def get_head_revision(app: Flask) -> Optional[str]:
    """
    Get the latest available revision.
    
    Args:
        app: Flask application instance
        
    Returns:
        Head revision or None
    """
    alembic_cfg = get_alembic_config(app)
    script = ScriptDirectory.from_config(alembic_cfg)
    return script.get_current_head()


def init_alembic(app: Flask) -> None:
    """
    Initialize Alembic if not already initialized.
    
    Args:
        app: Flask application instance
    """
    backend_dir = Path(__file__).parent.parent.parent
    versions_dir = backend_dir / 'migrations' / 'versions'
    
    # Create versions directory if it doesn't exist
    versions_dir.mkdir(parents=True, exist_ok=True)
    
    app.logger.info("Alembic initialized successfully")




def check_and_create_tables(app: Flask) -> bool:
    """Check and create tables if needed."""
    try:
        with app.app_context():
            inspector = inspect(db.engine)
            existing = inspector.get_table_names()
            
            # Check if users table exists (main indicator of whether tables are created)
            if 'users' not in existing:
                app.logger.info("Creating tables...")
                db.create_all()
                app.logger.info("✓ Tables created")
                return True
            else:
                app.logger.info("✓ Tables exist")
                return True
                    
    except Exception as e:
        app.logger.error(f"Error: {str(e)}")
        return False




def init_database(app: Flask) -> bool:
    """Initialize database with automatic table creation."""
    try:
        app.logger.info("=== Initializing Database ===")
        
        # Ensure migrations directory exists
        backend_dir = Path(__file__).parent.parent.parent
        (backend_dir / 'migrations' / 'versions').mkdir(parents=True, exist_ok=True)
        
        # Check and create tables
        if check_and_create_tables(app):
            app.logger.info("=== Database Ready ===")
            return True
        else:
            app.logger.error("=== Database Init Failed ===")
            return False
            
    except Exception as e:
        app.logger.error(f"Fatal error: {str(e)}")
        return False




def create_seed_data(app: Flask) -> bool:
    """Create initial seed data if database is empty."""
    try:
        with app.app_context():
            if User.query.count() > 0:
                app.logger.info(f"✓ Seed data exists ({User.query.count()} users)")
                return True
            
            app.logger.info("Creating seed users...")
            
            # Admin
            admin = User(
                email='admin@facetrust.com',
                name='Admin',
                role=UserRole.ADMIN,
                is_active=True
            )
            db.session.add(admin)
            
            # Clients
            clients = [
                User(email='juan.perez@example.com', name='Juan Pérez', role=UserRole.CLIENT, is_active=True),
                User(email='maria.garcia@example.com', name='María García', role=UserRole.CLIENT, is_active=True),
                User(email='carlos.lopez@example.com', name='Carlos López', role=UserRole.CLIENT, is_active=True),
                User(email='ana.martinez@example.com', name='Ana Martínez', role=UserRole.CLIENT, is_active=False)
            ]
            
            for client in clients:
                db.session.add(client)
            
            db.session.commit()
            app.logger.info("✓ Seed data created (1 admin + 4 clients)")
            return True
            
    except Exception as e:
        app.logger.error(f"Error creating seed: {str(e)}")
        db.session.rollback()
        return False
