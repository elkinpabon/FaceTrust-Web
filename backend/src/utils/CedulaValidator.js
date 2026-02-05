/**
 * Validador de Cédula Ecuatoriana
 * Implementa el algoritmo oficial de validación de cédulas de Ecuador
 */

class CedulaValidator {
    /**
     * Valida una cédula ecuatoriana
     * @param {string} cedula - Número de cédula a validar
     * @returns {object} {valida: boolean, error: string|null, mensaje: string}
     */
    static validar(cedula) {
        // Validar que sea string y tenga 10 dígitos
        if (typeof cedula !== 'string') {
            return {
                valida: false,
                error: 'RUC_INVALID_FORMAT',
                mensaje: 'La cédula debe ser un texto de 10 dígitos'
            };
        }

        // Remover espacios y validar que sea solo números
        const cedulaLimpia = cedula.trim();
        if (!/^\d{10}$/.test(cedulaLimpia)) {
            return {
                valida: false,
                error: 'RUC_INVALID_LENGTH',
                mensaje: 'La cédula debe tener exactamente 10 dígitos'
            };
        }

        // Validar que la provincia sea válida (primeros 2 dígitos: 01-24)
        const provincia = parseInt(cedulaLimpia.substring(0, 2), 10);
        if (provincia < 1 || provincia > 24) {
            return {
                valida: false,
                error: 'PROVINCIA_INVALID',
                mensaje: 'Provincia de cédula inválida (debe estar entre 01 y 24)'
            };
        }

        // Validar el dígito verificador
        if (!this.validarDigitoVerificador(cedulaLimpia)) {
            return {
                valida: false,
                error: 'DIGITO_VERIFICADOR_INVALID',
                mensaje: 'Dígito verificador de cédula inválido'
            };
        }

        return {
            valida: true,
            error: null,
            mensaje: 'Cédula válida'
        };
    }

    /**
     * Valida el dígito verificador de la cédula
     * @param {string} cedula - Cédula de 10 dígitos
     * @returns {boolean}
     */
    static validarDigitoVerificador(cedula) {
        // Validar 3er dígito: 0-5 para persona natural
        const tercerDigito = parseInt(cedula.charAt(2), 10);
        if (tercerDigito < 0 || tercerDigito > 5) {
            return false;
        }

        // Coeficientes para cédula de persona natural (módulo 10)
        const coef = [2, 1, 2, 1, 2, 1, 2, 1, 2];
        let suma = 0;

        for (let i = 0; i < 9; i++) {
            let val = parseInt(cedula.charAt(i), 10) * coef[i];
            // Si el resultado es >= 10, sumar sus dígitos (equivalente a restar 9)
            if (val >= 10) {
                val -= 9;
            }
            suma += val;
        }

        // Calcular el módulo 10
        const verificadorCalculado = (10 - (suma % 10)) % 10;
        const verificadorReal = parseInt(cedula.charAt(9), 10);

        return verificadorCalculado === verificadorReal;
    }

    /**
     * Obtiene información sobre un error de validación
     * @param {string} codigoError - Código de error
     * @returns {string}
     */
    static obtenerMensajeError(codigoError) {
        const mensajes = {
            'RUC_INVALID_FORMAT': 'Formato de cédula inválido',
            'RUC_INVALID_LENGTH': 'La cédula debe tener exactamente 10 dígitos',
            'PROVINCIA_INVALID': 'Código de provincia inválido (01-24)',
            'DIGITO_VERIFICADOR_INVALID': 'El dígito verificador no es válido para esta cédula'
        };
        
        return mensajes[codigoError] || 'Cédula inválida';
    }
}

module.exports = CedulaValidator;
