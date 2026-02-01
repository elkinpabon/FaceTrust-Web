# FaceTrust - Sistema Integral de Reconocimiento Facial

## 📋 Descripción

**FaceTrust** es una plataforma empresarial de gestión de empleados con autenticación multifactor biométrica, 2FA con Google Authenticator, sistema de roles granulares y arquitectura basada en patrones SOLID. Ofrece máxima seguridad en autenticación mediante validación facial, doble factor de autenticación, y control de acceso basado en roles.

---

## 🔐 Seguridad Implementada

### 1. **Autenticación Biométrica (Reconocimiento Facial)**
- ✅ Detección y reconocimiento facial con **Face-API.js** (SSD MobileNet)
- ✅ Extracción de descriptores faciales (128 características)
- ✅ Validación con distancia euclidiana (threshold: 0.6)
- ✅ Captura automática en registro y login
- ✅ Comparación biométrica segura sin almacenar datos en bruto

### 2. **Autenticación de Dos Factores (2FA)**
- ✅ **Google Authenticator** compatible (TOTP - RFC 6238)
- ✅ Código de 6 dígitos con expiración
- ✅ Activación automática tras 3 intentos fallidos
- ✅ Bloqueo de cuenta tras 5 intentos
- ✅ Recuperación segura con fallback a 2FA durante validación facial

### 3. **Cadena de Seguridad en Login**
```
Email + Contraseña → 2FA (Google Authenticator) → Validación Facial → Acceso Dashboard
```

### 4. **Encriptación y Protección**
- ✅ Contraseñas encriptadas con **bcrypt** (10 rounds)
- ✅ JWT con expiración (7 días)
- ✅ Sanitización con **xss** para prevenir ataques XSS
- ✅ Rate limiting: 5 intentos por 15 minutos
- ✅ Helmet.js para headers de seguridad
- ✅ CORS configurado

---

## 👥 Sistema de Roles

### **Administrador**
- ✅ Dashboard con estadísticas de asistencia
- ✅ Gestión completa de usuarios (crear, editar, eliminar)
- ✅ Visualización de registros de asistencia de todos
- ✅ Búsqueda y filtrado avanzado
- ✅ Historial de cambios y auditoría
- ✅ Gestión de 2FA y biometría

### **Usuario/Empleado**
- ✅ Dashboard personal
- ✅ Perfil con información personal
- ✅ Registro de entrada/salida con validación facial
- ✅ Historial de asistencia personal
- ✅ Actualización limitada de datos
- ✅ Sincronización de dispositivo biométrico

---

## 🏗️ Patrones SOLID Implementados

### **1. Single Responsibility Principle (SRP)**
- **Controllers**: Cada controlador maneja un dominio específico
  - `AuthController.js` → Solo autenticación
  - `UsuarioController.js` → Solo usuarios
  - `RegistroController.js` → Solo asistencia
- **Services**: Servicios especializados
  - `TwoFactorService.js` → Solo lógica 2FA
  - `LoginAttempts.js` → Solo gestión de intentos

### **2. Open/Closed Principle (OCP)**
- **Middleware extensible**: Autenticación JWT sin modificar rutas
- **Models extensibles**: Nuevas propiedades sin romper existentes
- **Controllers preparados para nuevas funcionalidades**

### **3. Liskov Substitution Principle (LSP)**
- **Servicios intercambiables**:
  - `TwoFactorService` puede reemplazarse por otro proveedor 2FA
  - `LoginAttempts` implementa interfaz consistente
- **Models con métodos polimórficos**: `obtenerPorCorreo()`, `obtenerPorId()`

### **4. Interface Segregation Principle (ISP)**
- **AuthService API segregada**:
  ```javascript
  authService.registro()        // Interfaz registro
  authService.login()           // Interfaz login
  authService.verificarDosFA()  // Interfaz 2FA
  authService.verificarIdentidad() // Interfaz biometría
  ```
- **No hay métodos innecesarios**, cada cliente usa solo lo que necesita

### **5. Dependency Inversion Principle (DIP)**
- **Inyección de dependencias**:
  ```javascript
  // AuthController depende de abstracciones, no implementaciones
  const usuario = await Usuario.obtenerPorCorreo()
  const secret = await TwoFactorService.obtenerSecret()
  ```
- **Controllers no crean instancias**, reciben dependencias
- **Database es inyectada centralmente** en `database.js`

### **Patrones de Diseño Adicionales**
- **Singleton**: Pool de conexiones MySQL
- **Strategy**: Múltiples estrategias de autenticación (biometría, 2FA)
- **Factory**: Creación de usuarios y registros
- **Observer**: Context de React para estado de autenticación
- **Decorator**: Middleware JWT para rutas protegidas

## Requisitos

- Node.js v14+
- MySQL 5.7+
- npm 6.0+
- Navegador con soporte para:
  - WebRTC (acceso a cámara)
  - LocalStorage
  - ES6+

---

## ⚙️ Instalación

### 1. Clonar Repositorio

```bash
git clone https://github.com/usuario/FaceTrust-Web.git
cd FaceTrust-Web
```

### 2. Configurar Base de Datos

1. Abre PHPMyAdmin (`http://localhost/phpmyadmin`)
2. Crea una base de datos: `CREATE DATABASE facetrust;`
3. Selecciona la base de datos e importa:
   - `backend/migrations/` (se ejecutan automáticamente)

**Usuario Admin por defecto:**
```
Correo: admin@facetrust.com
Contraseña: Admin@123456
```

### 3. Backend

```bash
cd backend
npm install
cp .env.example .env  # Configurar variables de entorno
npm start
```

**Servidor**: `http://localhost:5000`

### 4. Frontend

```bash
cd frontend
npm install
npm start
```

**Aplicación**: `http://localhost:3000`

---

## ✨ Características Principales

### Autenticación y Seguridad
- ✅ Registro con validación biométrica facial
- ✅ Login multifactor (Email/Contraseña → 2FA → Biometría)
- ✅ Google Authenticator (TOTP de 6 dígitos)
- ✅ Reconocimiento facial con Face-API.js
- ✅ JWT con expiración configurável
- ✅ Rate limiting por IP (5 intentos/15 min)
- ✅ Sanitización XSS en todas las entradas
- ✅ Bcrypt con 10 rounds para contraseñas

### Gestión de Usuarios
- ✅ Roles: Admin y Empleado
- ✅ Permisos granulares por rol
- ✅ Datos personales: Cédula, Email, Teléfono, Dirección
- ✅ Historial de cambios (auditoría)
- ✅ Validación de cédula única
- ✅ Validación de email único

### Registro de Asistencia
- ✅ Entrada/Salida con timestamp
- ✅ Validación biométrica en cada registro
- ✅ Historial de asistencia personal
- ✅ Duración de jornada calculada
- ✅ Reportes por período
- ✅ Estadísticas admin

### Dashboards
- **Admin**: Estadísticas, usuarios, asistencia, auditoría
- **Empleado**: Perfil, registros personales, historial

---

## 📁 Estructura de Proyecto

```
FaceTrust-Web/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js              # Pool MySQL (Singleton)
│   │   ├── controllers/
│   │   │   ├── AuthController.js        # Lógica autenticación
│   │   │   ├── UsuarioController.js     # Gestión usuarios
│   │   │   └── RegistroController.js    # Asistencia
│   │   ├── models/
│   │   │   ├── Usuario.js               # Query builder
│   │   │   └── Registro.js
│   │   ├── middleware/
│   │   │   └── autenticacion.js         # Verificar JWT
│   │   ├── services/
│   │   │   ├── TwoFactorService.js      # TOTP logic
│   │   │   └── LoginAttempts.js         # Control intentos
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   ├── usuarioRoutes.js
│   │   │   └── registroRoutes.js
│   │   ├── migrations/
│   │   │   ├── 001_create_usuarios.js
│   │   │   ├── 008_create_two_factor_auth.js
│   │   │   └── ...
│   │   └── index.js                    # Entry point
│   ├── .env.example
│   ├── package.json
│   └── README.md
│
├── frontend/
│   ├── public/
│   │   ├── index.html
│   │   └── models/                     # Face-API models
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.jsx               # Login + 2FA
│   │   │   ├── Registro.jsx            # Registro + Facial
│   │   │   ├── ValidarIdentidad.jsx    # Facial + 2FA fallback
│   │   │   ├── DashboardAdmin.jsx
│   │   │   └── DashboardUsuario.jsx
│   │   ├── components/
│   │   │   ├── FaceScanner.jsx         # Facial capture
│   │   │   ├── Modal2FA.jsx            # 2FA QR
│   │   │   ├── ProtectedRoute.jsx      # Rutas privadas
│   │   │   └── WaveBackground.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx         # Observer pattern
│   │   ├── services/
│   │   │   └── api.js                  # Axios client
│   │   ├── styles/
│   │   │   ├── auth.css
│   │   │   ├── dashboard.css
│   │   │   └── faceScanner.css
│   │   └── App.jsx
│   ├── package.json
│   └── README.md
│
└── README.md
```

## 🔄 Flujos de Autenticación

### **Registro**
```
1. Formulario datos personales
2. Validación de cedula/email únicos
3. Encriptación bcrypt
4. Escaneo facial automático
5. Extracción descriptor facial
6. Almacenamiento en BD
7. Confirmación exitosa
```

### **Login Estándar**
```
1. Email + Contraseña
2. ✓ Intento 1-2: Solo credenciales
3. ✗ Intento 3: Mostrar opción 2FA
4. ✗ Intento 5: Bloquear + Requiere 2FA
5. Verificar 2FA si aplica
6. Validar rostro (biometría)
7. Generar JWT
8. Acceso dashboard
```

### **Login con 2FA Fallback**
```
1. Email + Contraseña (OK)
2. Validación facial (FALLA)
   ↓
3. Mostrar opción: Usar 2FA
4. Ingresar código de 6 dígitos
5. TOTP verificado
6. Generar JWT
7. Acceso dashboard
```

---

## 📡 API REST Endpoints

### **Autenticación**
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/auth/registro` | Registrar nuevo usuario |
| POST | `/api/auth/login` | Login email/contraseña |
| POST | `/api/auth/solicitar-2fa` | Generar QR 2FA |
| POST | `/api/auth/verificar-2fa` | Verificar código TOTP |
| POST | `/api/auth/imagen-facial/:usuarioId` | Guardar imagen facial |
| GET | `/api/auth/imagen-facial/:usuarioId` | Obtener imagen facial |
| POST | `/api/auth/verificar-identidad/:usuarioId` | Validar biometría |
| POST | `/api/auth/registrar-fallo-facial/:usuarioId` | Registrar fallo |

### **Usuarios (Requiere autenticación)**
| Método | Endpoint | Descripción | Roles |
|--------|----------|-------------|-------|
| GET | `/api/usuarios/perfil` | Obtener perfil actual | Todos |
| PUT | `/api/usuarios/perfil` | Actualizar perfil | Todos |
| GET | `/api/usuarios` | Listar todos | Admin |
| GET | `/api/usuarios/:usuarioId` | Obtener usuario | Admin |
| PUT | `/api/usuarios/:usuarioId` | Actualizar usuario | Admin |
| DELETE | `/api/usuarios/:usuarioId` | Eliminar usuario | Admin |
| GET | `/api/usuarios/logs/login` | Historial login | Admin |

### **Registros de Asistencia**
| Método | Endpoint | Descripción | Roles |
|--------|----------|-------------|-------|
| POST | `/api/registros/entrada` | Registrar entrada | Empleado |
| POST | `/api/registros/salida` | Registrar salida | Empleado |
| GET | `/api/registros/mis-registros` | Mis registros | Empleado |
| GET | `/api/registros` | Todos los registros | Admin |
| GET | `/api/registros/usuario/:usuarioId` | Registros de usuario | Admin |

---

## 🔒 Seguridad Detallada

### **Protecciones de Contraseña**
- ✅ Bcrypt 10 rounds (>100ms por hash)
- ✅ Validación: Mayúsculas, minúsculas, números, especiales
- ✅ Longitud mínima: 8 caracteres

### **Protecciones de 2FA**
- ✅ TOTP con RFC 6238
- ✅ Ventana de expiración: 30 segundos
- ✅ Código de 6 dígitos (1 millón combinaciones)
- ✅ Compatible con Google Authenticator, Microsoft Authenticator

### **Protecciones Biométricas**
- ✅ 128 características faciales extraídas
- ✅ Distancia euclidiana < 0.6 requerida
- ✅ Rechazo automático de identidades falsas
- ✅ Logging de fallos para auditoría

### **Protecciones de Sesión**
- ✅ JWT con expiración (7 días)
- ✅ Signature HMAC-SHA256
- ✅ Logout limpia token
- ✅ Re-autenticación en acciones críticas

### **Protecciones contra Ataques**
- ✅ **CSRF**: Headers CORS configurados
- ✅ **XSS**: Sanitización con xss.js
- ✅ **SQL Injection**: Prepared statements (mysql2)
- ✅ **Brute Force**: Rate limiting (5/15min)
- ✅ **Timing Attacks**: Uso de bcrypt
- ✅ **HTTPS Ready**: Helmet.js configurado

### **Auditoría y Logging**
- ✅ Registro de intentos login fallidos
- ✅ Registro de logins exitosos (ID: 51-60 en logs)
- ✅ Tracking de cambios de rol/usuario
- ✅ Timestamp en todos los eventos

---

## 🛠️ Solución de Problemas

### **"No se puede conectar a la base de datos"**
```
✓ Verifica que MySQL esté corriendo
✓ Confirma que la BD `facetrust` existe
✓ Revisa credenciales en backend/.env:
  DB_HOST=localhost
  DB_USER=root
  DB_PASSWORD=
  DB_NAME=facetrust
```

### **"La cámara no funciona"**
```
✓ Permite permisos de cámara en navegador
✓ Verifica que ninguna app use la cámara
✓ Usa HTTPS en producción
✓ Abre consola (F12) para ver errores
✓ Comprueba FaceScanner logs: [CAMERA]
```

### **"Modelos face-api no cargan"**
```
✓ Verifica archivos en frontend/public/models/
✓ Comprueba rutas correctas
✓ Mira Network tab en DevTools
✓ Busca logs: [FACE-API] en consola
```

### **"2FA no genera QR"**
```
✓ Comprueba que speakeasy esté instalado
✓ Verifica que qrcode esté disponible
✓ Mira logs: [TwoFactorService]
✓ Usa navegador moderno (Chrome, Firefox)
```

### **"Rostro no se reconoce"**
```
✓ Aumento de iluminación
✓ Posición frontal al rostro
✓ Distancia: 30-60 cm de cámara
✓ Revisa threshold actual: 0.6
✓ Logs: [VALIDAR] Distancia euclidiana
```

---

## 📊 Tecnologías Utilizadas

### **Backend**
| Tecnología | Versión | Propósito |
|-----------|---------|----------|
| Node.js | 14+ | Runtime JavaScript |
| Express.js | 4.17+ | Framework web |
| MySQL2 | 2.3+ | Driver BD |
| bcryptjs | 2.4+ | Hash contraseñas |
| jsonwebtoken | 9.0+ | JWT signing |
| speakeasy | 2.0+ | TOTP/2FA |
| qrcode | 1.4+ | Generador QR |
| helmet | 7.0+ | Headers seguridad |
| express-rate-limit | 6.7+ | Rate limiting |
| xss | 1.0+ | Sanitización XSS |

### **Frontend**
| Tecnología | Versión | Propósito |
|-----------|---------|----------|
| React | 18.2+ | UI framework |
| axios | 1.3+ | HTTP client |
| face-api.js | 0.22+ | Reconocimiento facial |
| lucide-react | 0.263+ | Iconos |
| React Router | 6.8+ | Routing |

### **Base de Datos**
| Entidad | Campos | Índices |
|---------|--------|---------|
| usuarios | 11 | cedula(UNIQUE), correo(UNIQUE) |
| two_factor_auth | 4 | usuario_id(FK) |
| login_attempts | 5 | correo, timestamp |
| login_logs | 6 | usuario_id, tipo |
| registro_asistencia | 5 | usuario_id, tipo |

---

## 📈 Métricas de Rendimiento

- **JWT Expiry**: 7 días configurable
- **Rate Limit**: 5 intentos/15 minutos
- **Bcrypt Rounds**: 10 (100ms por operación)
- **TOTP Window**: ±30 segundos
- **Facial Recognition**: ~500ms por foto
- **Pool Conexiones**: 10 máximo

---

## 📝 Variables de Entorno (.env)
