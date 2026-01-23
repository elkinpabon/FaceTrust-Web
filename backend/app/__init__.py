"""
FaceTrust Backend Application Factory
Secure Biometric Authentication System
"""
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_restx import Api

from app.config import get_config
from app.models import db
from app.middleware.security_headers import setup_security_headers


def create_app(config_name='development'):
    """
    Application Factory Pattern
    
    Args:
        config_name: Configuration environment (development, testing, production)
    
    Returns:
        Configured Flask application
    """
    app = Flask(__name__)
    
    # Load configuration
    config = get_config(config_name)
    app.config.from_object(config)
    
    # Initialize extensions
    init_extensions(app)
    
    # Register blueprints
    register_blueprints(app)
    
    # Setup middleware
    setup_middleware(app)
    
    # Setup security headers
    setup_security_headers(app)
    
    return app


def init_extensions(app):
    """Initialize Flask extensions"""
    
    # Database
    db.init_app(app)
    
    # JWT Authentication
    jwt = JWTManager(app)
    
    # CORS Configuration
    CORS(app, 
         origins=app.config['ALLOWED_ORIGINS'],
         supports_credentials=True,
         allow_headers=['Content-Type', 'Authorization'],
         methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])
    
    # Rate Limiting
    from app.middleware.rate_limit import limiter
    limiter.init_app(app)
    
    # API Documentation
    api = Api(app,
              version='1.0',
              title='FaceTrust API',
              description='Secure Biometric Authentication System',
              doc='/api/docs',
              security='Bearer Auth',
              authorizations={
                  'Bearer Auth': {
                      'type': 'apiKey',
                      'in': 'header',
                      'name': 'Authorization',
                      'description': 'JWT Token: Bearer <token>'
                  }
              })
    
    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(jwt_header, jwt_payload):
        """Check if JWT token is revoked"""
        from app.services.auth_service import AuthService
        jti = jwt_payload['jti']
        return AuthService.is_token_revoked(jti)
    
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        """Handle expired token"""
        return {'error': 'Token has expired', 'code': 'token_expired'}, 401
    
    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        """Handle invalid token"""
        return {'error': 'Invalid token', 'code': 'invalid_token'}, 401
    
    @jwt.unauthorized_loader
    def unauthorized_callback(error):
        """Handle missing token"""
        return {'error': 'Missing authorization token', 'code': 'unauthorized'}, 401


def register_blueprints(app):
    """Register API blueprints"""
    from app.controllers.auth import auth_bp
    from app.controllers.user import user_bp
    from app.controllers.audit import audit_bp
    from app.controllers.health import health_bp
    
    app.register_blueprint(health_bp, url_prefix='/api')
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(user_bp, url_prefix='/api/users')
    app.register_blueprint(audit_bp, url_prefix='/api/audit')


def setup_middleware(app):
    """Setup custom middleware"""
    
    @app.before_request
    def before_request():
        """Execute before each request"""
        from app.services.audit_service import AuditService
        from flask import request
        
        # Log request (solo para debug, no en producción)
        if app.config['DEBUG']:
            app.logger.debug(f'{request.method} {request.path}')
    
    @app.after_request
    def after_request(response):
        """Execute after each request"""
        return response
    
    @app.errorhandler(404)
    def not_found(error):
        """Handle 404 errors"""
        return {'error': 'Resource not found', 'code': 'not_found'}, 404
    
    @app.errorhandler(500)
    def internal_error(error):
        """Handle 500 errors"""
        app.logger.error(f'Internal error: {error}')
        db.session.rollback()
        return {'error': 'Internal server error', 'code': 'internal_error'}, 500
