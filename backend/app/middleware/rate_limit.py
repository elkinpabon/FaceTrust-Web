"""
Rate Limiting Middleware
Flask-Limiter with memory storage
"""
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

# Initialize limiter with memory storage
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["100 per minute"],
    storage_uri="memory://",
    strategy="fixed-window"
)
