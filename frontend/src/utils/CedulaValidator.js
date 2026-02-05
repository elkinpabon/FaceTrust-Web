/**
 * Validador de Cédula Ecuatoriana (Frontend)
 * Validación del lado del cliente para dar feedback inmediato
 */

export class CedulaValidator {
    /**
     * Valida una cédula ecuatoriana
     * @param {string} cedula - Número de cédula a validar
     * @returns {object} {valida: boolean, error: string|null, mensaje: string}
     */
    static validar(cedula) {
        if (!cedula) {
            return {
                valida: false,
                error: 'EMPTY',
                mensaje: 'Ingresa una cédula'
            };
        }

        // Remover espacios y validar que sea solo números
        const cedulaLimpia = cedula.trim();
        if (!/^\d{10}$/.test(cedulaLimpia)) {
            return {
                valida: false,
                error: 'INVALID_FORMAT',
                mensaje: 'La cédula debe tener exactamente 10 dígitos'
            };
        }

        // Validar provincia
        const provincia = parseInt(cedulaLimpia.substring(0, 2), 10);
        if (provincia < 1 || provincia > 24) {
            return {
                valida: false,
                error: 'PROVINCIA_INVALID',
                mensaje: 'Código de provincia inválido (01-24)'
            };
        }

        // Validar el dígito verificador
        if (!this.validarDigitoVerificador(cedulaLimpia)) {
            return {
                valida: false,
                error: 'DIGITO_VERIFICADOR_INVALID',
                mensaje: 'Dígito verificador inválido'
            };
        }

        return {
            valida: true,
            error: null,
            mensaje: 'Cédula válida'
        };
    }

    /**
     * Valida solo el formato (sin validar dígito verificador)
     * Útil para validación en tiempo real mientras el usuario escribe
     */
    static validarFormato(cedula) {
        if (!cedula || !/^\d{10}$/.test(cedula)) {
            return false;
        }

        const provincia = parseInt(cedula.substring(0, 2), 10);
        if (provincia < 1 || provincia > 24) {
            return false;
        }

        const tercerDigito = parseInt(cedula.charAt(2), 10);
        return tercerDigito >= 0 && tercerDigito <= 5;
    }


    /**
     * Valida el dígito verificador
     */
    static validarDigitoVerificador(cedula) {
        // 3er dígito: 0-5 para persona natural
        const tercerDigito = parseInt(cedula.charAt(2), 10);
        if (tercerDigito < 0 || tercerDigito > 5) return false;

        const coef = [2, 1, 2, 1, 2, 1, 2, 1, 2];
        let suma = 0;

        for (let i = 0; i < 9; i++) {
            let val = parseInt(cedula.charAt(i), 10) * coef[i];
            if (val >= 10) val -= 9; // equivalente a sumar dígitos (ej: 12 -> 1+2=3)
            suma += val;
        }

        const verificadorCalculado = (10 - (suma % 10)) % 10;
        const verificadorReal = parseInt(cedula.charAt(9), 10);

        return verificadorCalculado === verificadorReal;
    }


    /**
     * Obtiene información de una provincia de Ecuador por código
     */
    static obtenerNombreProvincia(codigo) {
        const provincias = {
            '01': 'Azuay',
            '02': 'Bolívar',
            '03': 'Cañar',
            '04': 'Carchi',
            '05': 'Cotopaxi',
            '06': 'Chimborazo',
            '07': 'El Oro',
            '08': 'Esmeraldas',
            '09': 'Guayas',
            '10': 'Pichincha',
            '11': 'Imbabura',
            '12': 'Loja',
            '13': 'Los Ríos',
            '14': 'Manabí',
            '15': 'Morona Santiago',
            '16': 'Napo',
            '17': 'Pastaza',
            '18': 'Tungurahua',
            '19': 'Zamora Chinchipe',
            '20': 'Galápagos',
            '21': 'Sucumbíos',
            '22': 'Orellana',
            '23': 'Santa Elena',
            '24': 'Santo Domingo de los Tsáchilas'
        };

        return provincias[codigo] || 'Desconocida';
    }
}

export default CedulaValidator;
