# FaceTrust - Autenticación Biométrica Segura 🔐

Sistema Full-Stack de autenticación con **WebAuthn + Liveness Detection** (100% cliente, NO almacena biometría).

## 🚀 Stack Tecnológico

- **Backend:** Flask 3.0 + TiDB Cloud (MySQL-compatible)
- **Frontend:** Next.js 14+ + TypeScript + Tailwind CSS
- **Biometría:** WebAuthn (FaceID/Windows Hello/Touch ID)
- **Liveness:** TensorFlow.js + BlazeFace (100% client-side)
- **Seguridad:** JWT, RBAC, Rate Limiting, OWASP Headers

## ⚡ Inicio Rápido

### 1. Backend (Flask)

```bash
cd backend
python -m venv venv
.\venv\Scripts\activate        # Windows
# source venv/bin/activate     # Linux/Mac
pip install -r requirements.txt
python run.py
```

El backend arranca en `https://localhost:5000` y automáticamente:
- ✅ Crea tablas en TiDB Cloud
- ✅ Ejecuta migraciones con Alembic
- ✅ Seed data (1 admin + 4 clientes)

### 2. Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

El frontend arranca en `http://localhost:3000`

### 3. Usuarios de Prueba

- **Admin:** admin@facetrust.com
- **Clientes:** 
  - juan.perez@clients.com
  - maria.garcia@clients.com
  - carlos.lopez@clients.com
  - ana.martinez@clients.com

**Nota:** NO hay contraseñas. Usa WebAuthn (biometría del dispositivo) para autenticarte.

## 📁 Estructura del Proyecto

```
FaceTrust-Web/
├── backend/                    # Flask API
│   ├── app/
│   │   ├── models/             # SQLAlchemy models
│   │   ├── services/           # Business logic
│   │   ├── controllers/        # REST endpoints
│   │   ├── middleware/         # JWT, RBAC, Rate Limiting
│   │   └── utils/              # Database init, helpers
│   ├── migrations/             # Alembic migrations
│   ├── run.py                  # Entry point
│   ├── requirements.txt        # Python dependencies
│   └── .env                    # TiDB Cloud config
├── frontend/                   # Next.js 14
│   ├── app/
│   │   ├── login/              # Login page
│   │   ├── register/           # Register page
│   │   └── dashboard/
│   │       ├── admin/          # Admin dashboard
│   │       └── client/         # Client dashboard
│   ├── components/
│   │   ├── auth/               # Auth components
│   │   └── liveness/           # Liveness detection
│   ├── lib/
│   │   ├── services/           # API client, WebAuthn
│   │   └── store/              # Zustand state management
│   └── types/                  # TypeScript definitions
└── README.md                   # Este archivo
```

## 🔒 Características de Seguridad

### Backend
- ✅ **WebAuthn Server**: Gestión de credenciales FIDO2
- ✅ **No Biometric Storage**: Solo public keys almacenadas
- ✅ **JWT + Refresh Tokens**: Access (1h) + Refresh (7d)
- ✅ **Rate Limiting**: 5 intentos login / 15 min
- ✅ **RBAC**: Admin vs Client roles
- ✅ **Audit Logging**: Todas las acciones registradas
- ✅ **OWASP Headers**: CSP, HSTS, X-Frame-Options
- ✅ **SQL Injection Protection**: SQLAlchemy ORM

### Frontend
- ✅ **Liveness Detection**: TensorFlow.js BlazeFace
- ✅ **Client-side Only**: Biometría NUNCA sale del dispositivo
- ✅ **WebAuthn Client**: @simplewebauthn/browser
- ✅ **TypeScript**: Type-safe development
- ✅ **Secure Storage**: JWT en localStorage con rotation

## 🌐 Endpoints API Principales

### Autenticación
- `POST /api/auth/webauthn/register/begin` - Iniciar registro
- `POST /api/auth/webauthn/register/complete` - Completar registro
- `POST /api/auth/webauthn/login/begin` - Iniciar login
- `POST /api/auth/webauthn/login/complete` - Completar login
- `POST /api/auth/refresh` - Renovar access token
- `POST /api/auth/logout` - Cerrar sesión
- `GET /api/auth/me` - Perfil usuario actual

### Usuarios (Admin only)
- `GET /api/users` - Listar usuarios
- `GET /api/users/:id` - Obtener usuario
- `PATCH /api/users/:id` - Actualizar usuario
- `DELETE /api/users/:id` - Eliminar usuario

### Auditoría (Admin only)
- `GET /api/audit/logs` - Logs de auditoría
- `GET /api/audit/logs/:id` - Log específico

### Health
- `GET /api/health` - Estado del servidor
- `GET /api/ready` - Readiness check
- `GET /api/version` - Versión del API

**Documentación Swagger:** `https://localhost:5000/api/docs`

## 🎯 Flujo de Autenticación

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
