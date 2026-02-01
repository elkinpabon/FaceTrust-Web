const pool = require('../config/database');

class LoginAttempts {
    /**
     * Registrar intento fallido de login
     */
    static async registrarIntento(correo) {
        try {
            const query = `
                INSERT INTO login_attempts (correo, intento, fecha)
                VALUES (?, 1, NOW())
                ON DUPLICATE KEY UPDATE
                intento = intento + 1,
                fecha = NOW()
            `;
            await pool.query(query, [correo.toLowerCase()]);
        } catch (error) {
            console.error('[ERROR] Registrar intento:', error.message);
        }
    }

    /**
     * Obtener número de intentos fallidos
     */
    static async obtenerIntentos(correo) {
        try {
            const query = `
                SELECT intento FROM login_attempts 
                WHERE correo = ? AND fecha > DATE_SUB(NOW(), INTERVAL 30 MINUTE)
            `;
            const [resultados] = await pool.query(query, [correo.toLowerCase()]);
            return resultados.length > 0 ? resultados[0].intento : 0;
        } catch (error) {
            console.error('[ERROR] Obtener intentos:', error.message);
            return 0;
        }
    }

    /**
     * Limpiar intentos después de login exitoso
     */
    static async limpiarIntentos(correo) {
        try {
            const query = 'DELETE FROM login_attempts WHERE correo = ?';
            await pool.query(query, [correo.toLowerCase()]);
        } catch (error) {
            console.error('[ERROR] Limpiar intentos:', error.message);
        }
    }

    /**
     * Verificar si está bloqueado
     */
    static async estaBloqueado(correo) {
        const intentos = await this.obtenerIntentos(correo);
        return intentos >= 5;
    }
}

module.exports = LoginAttempts;
