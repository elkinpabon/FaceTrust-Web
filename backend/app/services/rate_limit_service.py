"""
Rate Limiting Service
Protects against brute force attacks
"""
import time
from datetime import datetime, timedelta
from typing import Optional, Dict
from flask import current_app

from app.services.audit_service import AuditService

# In-memory rate limit tracking
_rate_limits: Dict[str, Dict] = {}


class RateLimitService:
    """
    Rate Limiting Service
    
    Implementa protección contra ataques de fuerza bruta:
    - Login: 5 intentos por 15 minutos
    - Registro: 3 intentos por 15 minutos
    - API general: 100 requests por minuto
    
    Usa memoria para tracking (producción: usar Redis/DB).
    """
    
    @staticmethod
    def check_rate_limit(identifier: str, limit: int, window: int) -> bool:
        """
        Check if rate limit is exceeded
        
        Args:
            identifier: Unique identifier (email, IP, etc.)
            limit: Maximum attempts allowed
            window: Time window in seconds
        
        Returns:
            Boolean - True if within limit, False if exceeded
        """
        if not current_app.config['RATE_LIMIT_ENABLED']:
            return True
        
        key = f'rate_limit:{identifier}'
        current_time = time.time()
        
        # Clean up expired entries
        if key in _rate_limits and current_time > _rate_limits[key]['expires_at']:
            del _rate_limits[key]
        
        # Get current count
        if key not in _rate_limits:
            # First attempt - set counter with expiration
            _rate_limits[key] = {
                'count': 1,
                'expires_at': current_time + window
            }
            return True
        
        current_count = _rate_limits[key]['count']
        
        if current_count >= limit:
            # Rate limit exceeded
            return False
        
        # Increment counter
        _rate_limits[key]['count'] += 1
        return True
    
    @staticmethod
    def get_remaining_attempts(identifier: str, limit: int) -> int:
        """
        Get remaining attempts before rate limit
        
        Args:
            identifier: Unique identifier
            limit: Maximum attempts allowed
        
        Returns:
            Number of remaining attempts
        """
        if not current_app.config['RATE_LIMIT_ENABLED']:
            return limit
        
        key = f'rate_limit:{identifier}'
        current_time = time.time()
        
        # Clean up expired
        if key in _rate_limits and current_time > _rate_limits[key]['expires_at']:
            del _rate_limits[key]
        
        if key not in _rate_limits:
            return limit
        
        current_count = _rate_limits[key]['count']
        remaining = max(0, limit - current_count)
        
        return remaining
    
    @staticmethod
    def get_retry_after(identifier: str) -> Optional[int]:
        """
        Get seconds until rate limit resets
        
        Args:
            identifier: Unique identifier
        
        Returns:
            Seconds until reset, or None if not rate limited
        """
        if not current_app.config['RATE_LIMIT_ENABLED']:
            return None
        
        key = f'rate_limit:{identifier}'
        current_time = time.time()
        
        if key not in _rate_limits:
            return None
        
        expires_at = _rate_limits[key]['expires_at']
        if current_time > expires_at:
            del _rate_limits[key]
            return None
        
        return int(expires_at - current_time)
    
    @staticmethod
    def reset_rate_limit(identifier: str):
        """
        Reset rate limit for identifier
        
        Args:
            identifier: Unique identifier
        """
        key = f'rate_limit:{identifier}'
        _rate_limits.pop(key, None)
    
    @staticmethod
    def check_login_rate_limit(email: str) -> tuple[bool, Optional[int]]:
        """
        Check login rate limit for email
        
        Args:
            email: User email
        
        Returns:
            Tuple of (is_allowed, retry_after_seconds)
        """
        limit = current_app.config['MAX_LOGIN_ATTEMPTS']
        window = current_app.config['RATE_LIMIT_WINDOW']
        
        identifier = f'login:{email.lower()}'
        
        is_allowed = RateLimitService.check_rate_limit(identifier, limit, window)
        
        if not is_allowed:
            retry_after = RateLimitService.get_retry_after(identifier)
            
            # Log rate limit trigger
            AuditService.log_rate_limit_triggered(None, 'login')
            
            return False, retry_after
        
        return True, None
    
    @staticmethod
    def check_register_rate_limit(email: str) -> tuple[bool, Optional[int]]:
        """
        Check registration rate limit for email
        
        Args:
            email: User email
        
        Returns:
            Tuple of (is_allowed, retry_after_seconds)
        """
        limit = current_app.config['MAX_REGISTER_ATTEMPTS']
        window = current_app.config['RATE_LIMIT_WINDOW']
        
        identifier = f'register:{email.lower()}'
        
        is_allowed = RateLimitService.check_rate_limit(identifier, limit, window)
        
        if not is_allowed:
            retry_after = RateLimitService.get_retry_after(identifier)
            
            # Log rate limit trigger
            AuditService.log_rate_limit_triggered(None, 'register')
            
            return False, retry_after
        
        return True, None
    
    @staticmethod
    def check_ip_rate_limit(ip_address: str, limit: int = 100, window: int = 60) -> bool:
        """
        Check general API rate limit by IP
        
        Args:
            ip_address: Client IP address
            limit: Maximum requests (default: 100)
            window: Time window in seconds (default: 60)
        
        Returns:
            Boolean - True if within limit, False if exceeded
        """
        identifier = f'api:{ip_address}'
        
        is_allowed = RateLimitService.check_rate_limit(identifier, limit, window)
        
        if not is_allowed:
            # Log rate limit trigger
            AuditService.log_rate_limit_triggered(None, 'api_general')
        
        return is_allowed
