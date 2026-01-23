"""
Health Check Controller
Provides system health and readiness endpoints
"""
from flask import Blueprint, jsonify
from sqlalchemy import text
from app.models import db

health_bp = Blueprint('health', __name__)


@health_bp.route('/health', methods=['GET'])
def health_check():
    """
    Health check endpoint
    
    Returns:
        JSON with health status and database connection status
    """
    try:
        # Test database connection
        db.session.execute(text('SELECT 1'))
        db_status = 'healthy'
    except Exception as e:
        db_status = f'unhealthy: {str(e)}'
    
    return jsonify({
        'status': 'healthy' if db_status == 'healthy' else 'degraded',
        'message': 'FaceTrust API is running',
        'database': db_status,
        'components': {
            'api': 'operational',
            'database': 'operational' if db_status == 'healthy' else 'error'
        }
    }), 200 if db_status == 'healthy' else 503


@health_bp.route('/ready', methods=['GET'])
def readiness_check():
    """
    Readiness check endpoint
    Used for Kubernetes/Docker health checks
    
    Returns:
        JSON indicating if service is ready to accept traffic
    """
    try:
        # Test database connection
        db.session.execute(text('SELECT 1'))
        return jsonify({
            'ready': True,
            'message': 'Service is ready to accept traffic'
        }), 200
    except Exception as e:
        return jsonify({
            'ready': False,
            'message': f'Service not ready: {str(e)}'
        }), 503


@health_bp.route('/version', methods=['GET'])
def version():
    """
    API version endpoint
    
    Returns:
        Current API version and build information
    """
    return jsonify({
        'version': '1.0.0',
        'name': 'FaceTrust API',
        'description': 'Secure Biometric Authentication System',
        'status': 'production'
    }), 200
