"""
Application Entry Point with Automatic Database Migrations
"""
import os
import sys
from app import create_app
from app.utils.db_init import init_database, create_seed_data

# Create app with environment configuration
env = os.getenv('FLASK_ENV', 'development')
app = create_app(env)

# Initialize database automatically on startup
with app.app_context():
    try:
        app.logger.info("Initializing database...")
        
        # Run migrations automatically
        if init_database(app):
            app.logger.info("✓ Database initialized successfully")
            
            # Create seed data if needed (only on first run)
            if create_seed_data(app):
                app.logger.info("✓ Seed data created/verified")
        else:
            app.logger.error("✗ Database initialization failed")
            sys.exit(1)
            
    except Exception as e:
        app.logger.error(f"✗ Fatal error during startup: {str(e)}")
        sys.exit(1)

if __name__ == '__main__':
    # Development server with HTTP (sin SSL para desarrollo local)
    # Para producción, usar Gunicorn o uWSGI con certificados SSL apropiados
    
    host = os.getenv('FLASK_HOST', 'localhost')
    port = int(os.getenv('FLASK_PORT', 5000))
    
    app.logger.info(f"Starting server on http://{host}:{port}")
    app.run(
        host=host,
        port=port,
        debug=app.config['DEBUG']
    )
