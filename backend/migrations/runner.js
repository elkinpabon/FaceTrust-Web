const path = require('path');
const fs = require('fs').promises;
const mysql = require('mysql2/promise');
require('dotenv').config();

class MigrationRunner {
    constructor() {
        this.migrationsPath = __dirname;
    }

    async createDatabase() {
        try {
            const connection = await mysql.createConnection({
                host: process.env.DB_HOST || 'localhost',
                user: process.env.DB_USER || 'root',
                password: process.env.DB_PASSWORD || '',
                port: process.env.DB_PORT || 3306
            });

            const dbName = process.env.DB_NAME || 'facetrust';
            
            await connection.query(
                `CREATE DATABASE IF NOT EXISTS ${dbName} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
            );
            
            console.log(`[OK] Base de datos "${dbName}" creada/verificada`);
            
            await connection.end();
        } catch (error) {
            throw new Error(`Error creando base de datos: ${error.message}`);
        }
    }

    async run() {
        console.log('\n════════════════════════════════════════');
        console.log('Iniciando migraciones de base de datos');
        console.log('════════════════════════════════════════\n');

        try {
            // Crear base de datos si no existe
            await this.createDatabase();

            // Importar pool después de crear la BD
            const pool = require('../src/config/database');

            // Crear tabla de control de migraciones si no existe
            await this.createMigrationsTable(pool);

            // Obtener todas las migraciones
            const migrationFiles = await this.getMigrationFiles();

            // Ejecutar cada migración
            for (const file of migrationFiles) {
                await this.executeMigration(file, pool);
            }

            console.log('\n════════════════════════════════════════');
            console.log('Migraciones completadas');
            console.log('════════════════════════════════════════\n');
        } catch (error) {
            console.error('\n[ERROR] Error en migraciones:', error.message);
            process.exit(1);
        }
    }

    async createMigrationsTable(pool) {
        try {
            const query = `
                CREATE TABLE IF NOT EXISTS migrations (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(255) NOT NULL UNIQUE,
                    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `;
            await pool.query(query);
        } catch (error) {
            throw new Error(`Error creando tabla de migraciones: ${error.message}`);
        }
    }

    async getMigrationFiles() {
        try {
            const files = await fs.readdir(this.migrationsPath);
            return files
                .filter(file => file.endsWith('.js') && file !== 'runner.js')
                .sort();
        } catch (error) {
            throw new Error(`Error leyendo carpeta de migraciones: ${error.message}`);
        }
    }

    async executeMigration(fileName, pool) {
        try {
            const migrationPath = path.join(this.migrationsPath, fileName);
            const migration = require(migrationPath);

            // Verificar si ya fue ejecutada
            const [executed] = await pool.query(
                'SELECT id FROM migrations WHERE name = ?',
                [migration.name]
            );

            if (executed.length > 0) {
                console.log(`[SKIP] ${migration.name} - ya ejecutada`);
                return;
            }

            // Ejecutar migración
            await migration.up();

            // Registrar migración
            await pool.query(
                'INSERT INTO migrations (name) VALUES (?)',
                [migration.name]
            );

            console.log(`[OK] ${migration.name}`);
        } catch (error) {
            throw new Error(`Error ejecutando migración ${fileName}: ${error.message}`);
        }
    }
}

module.exports = MigrationRunner;
