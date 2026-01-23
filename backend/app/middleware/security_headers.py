"""
Security Headers Middleware
Implements security best practices headers
"""
from flask import Flask


def setup_security_headers(app: Flask):
    """
    Configure security headers for all responses
    
    Implements OWASP recommendations:
    - Content Security Policy (CSP)
    - X-Frame-Options
    - X-Content-Type-Options
    - Strict-Transport-Security (HSTS)
    - X-XSS-Protection
    - Referrer-Policy
    """
    
    @app.after_request
    def add_security_headers(response):
        """Add security headers to every response"""
        
        if not app.config.get('ENABLE_SECURITY_HEADERS', True):
            return response
        
        # Content Security Policy - previene XSS
        csp = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "  # Ajustar en producción
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self' data:; "
            "connect-src 'self'; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self'"
        )
        response.headers['Content-Security-Policy'] = csp
        
        # Previene clickjacking
        response.headers['X-Frame-Options'] = 'DENY'
        
        # Previene MIME sniffing
        response.headers['X-Content-Type-Options'] = 'nosniff'
        
        # HTTP Strict Transport Security (HSTS)
        # Solo en HTTPS - fuerza conexiones seguras
        if app.config.get('SESSION_COOKIE_SECURE', False):
            response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload'
        
        # XSS Protection (legacy pero útil para navegadores antiguos)
        response.headers['X-XSS-Protection'] = '1; mode=block'
        
        # Referrer Policy - controla información de referrer
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        
        # Permissions Policy (antes Feature Policy)
        # Deshabilita características no necesarias
        permissions = (
            "geolocation=(), "
            "midi=(), "
            "notifications=(), "
            "push=(), "
            "sync-xhr=(), "
            "microphone=(), "
            "magnetometer=(), "
            "gyroscope=(), "
            "speaker=(), "
            "vibrate=(), "
            "payment=()"
        )
        response.headers['Permissions-Policy'] = permissions
        
        # Remove server header para no exponer tecnología
        response.headers.pop('Server', None)
        
        return response
    
    return app
