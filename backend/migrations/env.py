"""Alembic environment for migrations."""
import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

# Add backend to path
backend_path = os.path.dirname(os.path.dirname(__file__))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

config = context.config

# Log configuration
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Get database URL from environment or config
try:
    from app.config import Config
    database_url = Config.SQLALCHEMY_DATABASE_URI
except Exception:
    database_url = os.getenv('DATABASE_URL', 'sqlite:///:memory:')

config.set_main_option('sqlalchemy.url', database_url)

# Import models for autogenerate support
try:
    from app.models import db
    target_metadata = db.metadata
except Exception:
    target_metadata = None


def run_migrations_offline() -> None:
    """Run migrations offline."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations online."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
