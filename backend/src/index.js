const express = require('express');
const cors = require('cors');
require('dotenv').config();
const path = require('path');
const MigrationRunner = require('../migrations/runner');
const helmet = require('helmet');

// Importar rutas
const authRoutes = require('./routes/authRoutes');
const usuarioRoutes = require('./routes/usuarioRoutes');
const registroRoutes = require('./routes/registroRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware de seguridad
app.use(helmet());

// CORS configurado
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-registro-datos', 'x-descriptor-facial', 'x-dos-fa-secret', 'x-codigo-2fa']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/registros', registroRoutes);

// Ruta de prueba
app.get('/api/health', (req, res) => {
    res.json({ mensaje: 'Backend funcionando correctamente' });
});

// Manejo de errores 404
app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejo de errores general
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
});

// Ejecutar migraciones e iniciar servidor
const startServer = async () => {
    try {
        // Ejecutar migraciones
        const migrationRunner = new MigrationRunner();
        await migrationRunner.run();

        // Iniciar servidor
        app.listen(PORT, () => {
            console.log(`\n[OK] Servidor en puerto ${PORT}`);
            console.log(`[OK] URL: http://localhost:${PORT}`);
            console.log('════════════════════════════════════════\n');
        });
    } catch (error) {
        console.error('[ERROR] Error iniciando servidor:', error);
        process.exit(1);
    }
};

startServer();
