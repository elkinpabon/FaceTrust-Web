const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const pool = require('../config/database');

class TwoFactorService {
    /**
     * Generar nuevo secret para 2FA
     */
    static async generarSecret(email) {
        try {
            const secret = speakeasy.generateSecret({
                name: `FaceTrust (${email})`,
                issuer: 'FaceTrust',
                length: 32
            });

            console.log('[TwoFactorService] Secret generado:', secret.base32.substring(0, 10) + '...');
            console.log('[TwoFactorService] OTPAuth URL:', secret.otpauth_url);

            let qrCode = null;
            try {
                qrCode = await QRCode.toDataURL(secret.otpauth_url);
                console.log('[TwoFactorService] QR generado exitosamente, tamaño:', qrCode.length, 'caracteres');
            } catch (qrError) {
                console.error('[TwoFactorService] Error generando QR:', qrError.message);
            }

            return {
                secret: secret.base32,
                qrCode: qrCode
            };
        } catch (error) {
            console.error('[TwoFactorService] Error en generarSecret:', error);
            throw error;
        }
    }

    /**
     * Habilitar 2FA para usuario
     */
    static async habilitarDosFA(usuarioId, secret) {
        try {
            const query = `
                INSERT INTO two_factor_auth (usuario_id, secret_key, is_enabled)
                VALUES (?, ?, TRUE)
                ON DUPLICATE KEY UPDATE
                secret_key = ?,
                is_enabled = TRUE
            `;
            await pool.query(query, [usuarioId, secret, secret]);
            console.log(`[2FA] 2FA habilitado para usuario ${usuarioId}`);
            return true;
        } catch (error) {
            console.error('[ERROR] Habilitar 2FA:', error.message);
            throw error;
        }
    }

    /**
     * Deshabilitar 2FA
     */
    static async deshabilitarDosFA(usuarioId) {
        try {
            const query = 'UPDATE two_factor_auth SET is_enabled = FALSE WHERE usuario_id = ?';
            await pool.query(query, [usuarioId]);
            console.log(`[2FA] 2FA deshabilitado para usuario ${usuarioId}`);
            return true;
        } catch (error) {
            console.error('[ERROR] Deshabilitar 2FA:', error.message);
            throw error;
        }
    }

    /**
     * Verificar si 2FA está habilitado
     */
    static async estaHabilitado(usuarioId) {
        try {
            const query = 'SELECT is_enabled FROM two_factor_auth WHERE usuario_id = ? AND is_enabled = TRUE';
            const [resultados] = await pool.query(query, [usuarioId]);
            return resultados.length > 0;
        } catch (error) {
            console.error('[ERROR] Verificar 2FA habilitado:', error.message);
            return false;
        }
    }

    /**
     * Obtener secret del usuario
     */
    static async obtenerSecret(usuarioId) {
        try {
            const query = 'SELECT secret_key FROM two_factor_auth WHERE usuario_id = ?';
            const [resultados] = await pool.query(query, [usuarioId]);
            return resultados.length > 0 ? resultados[0].secret_key : null;
        } catch (error) {
            console.error('[ERROR] Obtener secret:', error.message);
            return null;
        }
    }

    /**
     * Verificar código TOTP
     */
    static verificarCodigo(secret, codigo) {
        try {
            const esValido = speakeasy.totp.verify({
                secret: secret,
                encoding: 'base32',
                token: codigo,
                window: 2 // Permite 2 ventanas de tiempo (±30 segundos)
            });
            
            if (esValido) {
                console.log('[2FA] ✓ Código TOTP válido');
                return true;
            } else {
                console.log('[2FA] ✗ Código TOTP inválido');
                return false;
            }
        } catch (error) {
            console.error('[ERROR] Verificar código:', error.message);
            return false;
        }
    }

    /**
     * Generar códigos de respaldo (backup)
     */
    static generarCodigosRespaldo() {
        const codigos = [];
        for (let i = 0; i < 10; i++) {
            codigos.push(Math.random().toString(36).substring(2, 10).toUpperCase());
        }
        return codigos;
    }
}

module.exports = TwoFactorService;
