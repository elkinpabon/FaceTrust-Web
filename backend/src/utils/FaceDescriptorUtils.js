/**
 * Utilidades para manejar descriptores faciales
 */

class FaceDescriptorUtils {
    /**
     * Calcula la distancia euclidiana entre dos descriptores faciales
     * @param {Array|Buffer} descriptor1 - Primer descriptor facial
     * @param {Array|Buffer} descriptor2 - Segundo descriptor facial
     * @returns {number} - Distancia entre descriptores (0 = idénticos, >1 = diferentes)
     */
    static calcularDistancia(descriptor1, descriptor2) {
        try {
            // Si los descriptores son buffers, convertir a arrays
            const desc1 = Array.isArray(descriptor1) ? descriptor1 : JSON.parse(descriptor1.toString());
            const desc2 = Array.isArray(descriptor2) ? descriptor2 : JSON.parse(descriptor2.toString());

            if (!desc1 || !desc2 || desc1.length !== desc2.length) {
                console.error('[FACE-UTIL] Descriptores inválidos o de diferente tamaño');
                return Infinity;
            }

            // Calcular distancia euclidiana
            let suma = 0;
            for (let i = 0; i < desc1.length; i++) {
                const diff = desc1[i] - desc2[i];
                suma += diff * diff;
            }
            
            return Math.sqrt(suma);
        } catch (error) {
            console.error('[FACE-UTIL] Error calculando distancia:', error);
            return Infinity;
        }
    }

    /**
     * Verifica si dos rostros son similares basándose en la distancia
     * @param {Array|Buffer} descriptor1 - Primer descriptor facial
     * @param {Array|Buffer} descriptor2 - Segundo descriptor facial
     * @param {number} umbral - Umbral de similitud (default: 0.6)
     * @returns {boolean} - true si los rostros son similares
     */
    static sonSimilares(descriptor1, descriptor2, umbral = 0.6) {
        const distancia = this.calcularDistancia(descriptor1, descriptor2);
        console.log(`[FACE-UTIL] Distancia calculada: ${distancia.toFixed(3)} (umbral: ${umbral})`);
        return distancia < umbral;
    }

    /**
     * Extrae el descriptor facial de una imagen usando face-api.js
     * Esta función requiere que face-api.js esté disponible en el lado del servidor
     * @param {Buffer} imagenBuffer - Buffer de la imagen
     * @returns {Promise<Array>} - Descriptor facial (array de 128 valores)
     */
    static async extraerDescriptor(imagenBuffer) {
        // Nota: Esta función requiere canvas y face-api.js en el servidor
        // Por ahora, asumimos que el descriptor viene desde el frontend
        throw new Error('Extracción de descriptor en servidor no implementada. Usar descriptor del frontend.');
    }

    /**
     * Valida que un descriptor tenga el formato correcto
     * @param {any} descriptor - Descriptor a validar
     * @returns {boolean} - true si el descriptor es válido
     */
    static esDescriptorValido(descriptor) {
        try {
            const desc = Array.isArray(descriptor) ? descriptor : JSON.parse(descriptor.toString());
            return Array.isArray(desc) && desc.length === 128 && desc.every(val => typeof val === 'number');
        } catch {
            return false;
        }
    }
}

module.exports = FaceDescriptorUtils;
