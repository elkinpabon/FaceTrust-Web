"""
Script para eliminar un usuario de la base de datos
"""
import sys
from app import create_app
from app.models import db, User

def delete_user(email):
    """Eliminar usuario por email"""
    app = create_app('development')
    
    with app.app_context():
        user = User.query.filter_by(email=email.lower()).first()
        
        if user:
            print(f"Eliminando usuario: {user.email} (ID: {user.id})")
            db.session.delete(user)
            db.session.commit()
            print("✓ Usuario eliminado exitosamente")
        else:
            print(f"✗ Usuario con email '{email}' no encontrado")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Uso: python delete_user.py <email>")
        sys.exit(1)
    
    email = sys.argv[1]
    delete_user(email)
