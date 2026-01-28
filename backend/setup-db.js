const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function crearTablas() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'reconocimiento'
        });

        console.log('✓ Conectado a la base de datos');

        // Leer el archivo SQL
        const sqlPath = path.join(__dirname, './setup.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Ejecutar cada sentencia SQL
        const statements = sql.split(';').filter(stmt => stmt.trim());
        
        for (const statement of statements) {
            if (statement.trim()) {
                try {
                    await connection.query(statement);
                    console.log('✓ Sentencia ejecutada');
                } catch (error) {
                    // Ignorar errores de tablas que ya existen
                    if (!error.message.includes('already exists')) {
                        console.error('Error:', error.message);
                    } else {
                        console.log('✓ Tabla ya existe (ignorado)');
                    }
                }
            }
        }

        console.log('✓ ¡Tablas creadas exitosamente!');
        await connection.end();
        process.exit(0);
    } catch (error) {
        console.error('✗ Error:', error.message);
        process.exit(1);
    }
}

crearTablas();
