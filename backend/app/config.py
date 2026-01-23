"""
Configuration Module
Manages environment-specific settings
"""
import os
from datetime import timedelta
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class Config:
    """Base configuration"""
    
    # Flask
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-CHANGE-IN-PRODUCTION')
    DEBUG = False
    TESTING = False
    
    # Database - Build connection string from components
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    DB_PORT = os.getenv('DB_PORT', '3306')
    DB_USER = os.getenv('DB_USER', 'root')
    DB_PASSWORD = os.getenv('DB_PASSWORD', 'password')
    DB_NAME = os.getenv('DB_NAME', 'facetrust')
    
    SQLALCHEMY_DATABASE_URI = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}?ssl_verify_cert=false&ssl_verify_identity=false"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 3600,
        'pool_size': 10,
        'max_overflow': 20
    }
    
    # JWT
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'dev-jwt-secret-CHANGE-IN-PRODUCTION')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(seconds=int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES', 3600)))
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(seconds=int(os.getenv('JWT_REFRESH_TOKEN_EXPIRES', 604800)))
    JWT_TOKEN_LOCATION = ['headers']
    JWT_HEADER_NAME = 'Authorization'
    JWT_HEADER_TYPE = 'Bearer'
    
    # WebAuthn
    RP_NAME = os.getenv('RP_NAME', 'FaceTrust')
    RP_ID = os.getenv('RP_ID', 'localhost')
    ORIGIN = os.getenv('ORIGIN', 'https://localhost:3000')
    EXPECTED_ORIGIN = os.getenv('EXPECTED_ORIGIN', 'https://localhost:3000')
    
    # CORS
    ALLOWED_ORIGINS = os.getenv('ALLOWED_ORIGINS', 'https://localhost:3000').split(',')
    
    # Rate Limiting
    RATE_LIMIT_ENABLED = os.getenv('RATE_LIMIT_ENABLED', 'true').lower() == 'true'
    MAX_LOGIN_ATTEMPTS = int(os.getenv('MAX_LOGIN_ATTEMPTS', 5))
    MAX_REGISTER_ATTEMPTS = int(os.getenv('MAX_REGISTER_ATTEMPTS', 3))
    RATE_LIMIT_WINDOW = int(os.getenv('RATE_LIMIT_WINDOW', 900))  # 15 minutes
    
    # Security Headers
    ENABLE_SECURITY_HEADERS = os.getenv('ENABLE_SECURITY_HEADERS', 'true').lower() == 'true'
    
    # Logging
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
    LOG_FILE = os.getenv('LOG_FILE', 'logs/facetrust.log')
    
    # Session
    SESSION_COOKIE_SECURE = os.getenv('SESSION_COOKIE_SECURE', 'true').lower() == 'true'
    SESSION_COOKIE_HTTPONLY = os.getenv('SESSION_COOKIE_HTTPONLY', 'true').lower() == 'true'
    SESSION_COOKIE_SAMESITE = os.getenv('SESSION_COOKIE_SAMESITE', 'Strict')
    
    # OTP Fallback
    OTP_ENABLED = os.getenv('OTP_ENABLED', 'true').lower() == 'true'
    OTP_EXPIRY = int(os.getenv('OTP_EXPIRY', 300))  # 5 minutes
    OTP_LENGTH = int(os.getenv('OTP_LENGTH', 6))
    
    # Email (for OTP)
    MAIL_SERVER = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT = int(os.getenv('MAIL_PORT', 587))
    MAIL_USE_TLS = os.getenv('MAIL_USE_TLS', 'true').lower() == 'true'
    MAIL_USERNAME = os.getenv('MAIL_USERNAME')
    MAIL_PASSWORD = os.getenv('MAIL_PASSWORD')
    MAIL_DEFAULT_SENDER = os.getenv('MAIL_DEFAULT_SENDER', 'noreply@facetrust.com')


class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    TESTING = False


class TestingConfig(Config):
    """Testing configuration"""
    DEBUG = False
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    RATE_LIMIT_ENABLED = False


class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    TESTING = False
    
    # Override with strict production settings
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Strict'
    
    # Require production secrets
    if Config.SECRET_KEY == 'dev-secret-key-CHANGE-IN-PRODUCTION':
        raise ValueError('SECRET_KEY must be set in production')
    
    if Config.JWT_SECRET_KEY == 'dev-jwt-secret-CHANGE-IN-PRODUCTION':
        raise ValueError('JWT_SECRET_KEY must be set in production')


config_by_name = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}


def get_config(config_name='default'):
    """Get configuration by name"""
    return config_by_name.get(config_name, DevelopmentConfig)
