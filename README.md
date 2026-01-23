# FaceTrust - Autenticación Biométrica Segura

Sistema de autenticación con WebAuthn + Liveness Detection (100% cliente, NO almacena biometría).

## Stack

- **Backend:** Flask + TiDB Cloud (MySQL-compatible)
- **Frontend:** Next.js + TensorFlow.js
- **Seguridad:** WebAuthn, JWT, RBAC, Rate Limiting

## Inicio Rápido

### 1. Configurar Backend

```bash
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
```

La base de datos TiDB Cloud ya está configurada en `.env`.

### 2. Iniciar Servidor

```bash
python run.py
```

El sistema creará automáticamente:
- Tablas de base de datos
- Usuarios de prueba (admin@facetrust.com + 4 clientes)
- Migraciones automáticas

### 3. Usuarios de Prueba

- **Admin:** admin@facetrust.com
- **Clientes:** juan.perez@example.com, maria.garcia@example.com, etc.

## Endpoints API

- `POST /api/auth/register-begin` - Iniciar registro
- `POST /api/auth/register-complete` - Completar registro
- `POST /api/auth/login-begin` - Iniciar login
- `POST /api/auth/login-complete` - Completar login
- `POST /api/auth/otp/request` - Solicitar OTP fallback
- `GET /api/users/me` - Perfil usuario actual
- `GET /api/audit/logs` - Logs de auditoría (Admin)

Documentación completa: `https://localhost:5000/api/docs`

## Seguridad

- ✅ NO almacena fotos ni videos
- ✅ NO almacena embeddings faciales
- ✅ Solo guarda claves públicas WebAuthn
- ✅ Rate limiting por IP
- ✅ Auditoría inmutable
- ✅ HTTPS obligatorio## Seguridad

- ✅ NO almacena fotos ni videos
- ✅ NO almacena embeddings faciales
- ✅ Solo guarda claves públicas WebAuthn
- ✅ Rate limiting por IP
- ✅ Auditoría inmutable
- ✅ HTTPS obligatorio
