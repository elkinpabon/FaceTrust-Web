# Sistema de Reconocimiento Facial - Gestión de Empleados

## Descripción

Aplicación completa de gestión de empleados con autenticación facial, roles de usuario (admin y empleado), y registro de asistencia.

## Requisitos

- Node.js v14+
- MySQL/XAMPP
- npm

## Instalación

### 1. Base de Datos

1. Abre PHPMyAdmin (http://localhost/phpmyadmin)
2. Crea una base de datos llamada `reconocimiento`
3. Selecciona la base de datos y ve a SQL
4. Copia y ejecuta el contenido de `backend/setup.sql`

**Usuario Admin por defecto:**
- Correo: `admin@reconocimiento.com`
- Contraseña: `admin123`

### 2. Backend

```bash
cd backend
npm install
npm start
```

El servidor estará en `http://localhost:5000`

### 3. Frontend

```bash
cd frontend
npm install
npm start
```

La aplicación estará en `http://localhost:3000`

## Características

### Autenticación
- Registro de usuarios con datos personales
- Escaneo facial durante el registro
- Login con correo y contraseña
- Validación facial después del login
- JWT para sesiones

### Roles

#### Administrador
- Dashboard con estadísticas
- Gestión completa de usuarios (crear, buscar, eliminar)
- Visualización de registros de asistencia de todos
- Búsqueda y filtrado avanzado

#### Usuario/Empleado
- Dashboard personal
- Perfil con información personal
- Registro de entrada/salida
- Historial de asistencia
- Actualización limitada de datos

### Registro de Asistencia
- Registro automático de entrada/salida
- Validación facial en cada registro
- Historial completo de asistencia
- Cálculo de duración de jornada

## Estructura

```
Reconocimiento-Facial1 Dise+¦o/
├── backend/
│   ├── src/
│   │   ├── config/         (Base de datos)
│   │   ├── controllers/    (Lógica de negocio)
│   │   ├── models/         (Modelos de datos)
│   │   ├── routes/         (Rutas API)
│   │   ├── middleware/     (Autenticación JWT)
│   │   └── index.js        (Servidor principal)
│   ├── setup.sql           (SQL para crear tablas)
│   └── package.json
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── pages/          (Login, Registro, Dashboards)
│   │   ├── components/     (FaceScanner, ProtectedRoute)
│   │   ├── services/       (API calls)
│   │   ├── context/        (AuthContext)
│   │   ├── styles/         (CSS)
│   │   └── App.js
│   └── package.json
│
└── README.md
```

## Flujo de Uso

### Registro
1. Acceder a `/registro`
2. Llenar formulario con datos personales
3. Hacer clic en "Continuar"
4. Escanear rostro con la cámara
5. Completar registro

### Login
1. Acceder a `/login`
2. Ingresar correo y contraseña
3. Hacer clic en "Continuar"
4. Escanear rostro para validar identidad
5. Si la identidad es verificada, acceder al dashboard

### Dashboard
- **Usuario:** Ver perfil, registrar entrada/salida, historial de asistencia
- **Admin:** Gestionar empleados, ver estadísticas, auditar asistencia

## API Endpoints

### Autenticación
- `POST /api/auth/registro` - Registrar nuevo usuario
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/imagen-facial/:usuarioId` - Guardar imagen facial
- `GET /api/auth/imagen-facial/:usuarioId` - Obtener imagen facial
- `POST /api/auth/verificar-identidad/:usuarioId` - Verificar identidad

### Usuarios
- `GET /api/usuarios/perfil` - Obtener perfil del usuario actual
- `PUT /api/usuarios/perfil` - Actualizar perfil
- `GET /api/usuarios` - Obtener todos los usuarios (admin)
- `GET /api/usuarios/:usuarioId` - Obtener usuario específico (admin)
- `DELETE /api/usuarios/:usuarioId` - Eliminar usuario (admin)

### Registros
- `POST /api/registros/entrada` - Registrar entrada
- `POST /api/registros/salida` - Registrar salida
- `GET /api/registros/mis-registros` - Obtener mis registros
- `GET /api/registros` - Obtener todos los registros (admin)
- `GET /api/registros/usuario/:usuarioId` - Obtener registros de usuario (admin)

## Notas de Seguridad

- Las contraseñas se encriptan con bcrypt
- Usa JWT para autenticación
- Se valida identidad facial en login
- Solo admins pueden gestionar usuarios
- Las imágenes faciales se almacenan en la BD

## Solución de Problemas

### "No se puede conectar a la base de datos"
- Verifica que XAMPP esté corriendo
- Confirma que la base de datos `reconocimiento` existe
- Revisa las credenciales en `.env` del backend

### "La cámara no funciona"
- Permite permisos de cámara en el navegador
- Verifica que ninguna otra aplicación use la cámara
- Intenta recargar la página

### "Modelos de face-api no cargan"
- Verifica que los archivos en `public/models/` existan
- Comprueba que la ruta sea correcta en la configuración
- Abre la consola del navegador para ver errores

## Licencia

Este proyecto es de código abierto y está disponible bajo la licencia MIT.

## Contacto

Para preguntas o soporte, contacta al equipo de desarrollo.
