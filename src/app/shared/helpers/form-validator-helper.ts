import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export class FormValidatorHelper {

    static getErrorMessage(control: AbstractControl | null, labelName: string): string {
        if (!control || !control.errors || (!control.touched && !control.dirty)) {
            return '';
        }

        const errors = control.errors;

        if (errors['required']) {
            return `El campo ${labelName} es requerido.`;
        }

        if (errors['email']) {
            return 'Ingresa un formato de correo válido.';
        }

        if (errors['minlength']) {
            const minLength = errors['minlength']?.requiredLength || 0;
            return `Mínimo ${minLength} caracteres.`;
        }

        if (errors['maxlength']) {
            const maxLength = errors['maxlength']?.requiredLength || 0;
            return `Máximo ${maxLength} caracteres permitidos.`;
        }

        if (errors['min']) {
            const min = errors['min']?.min;
            return `El valor mínimo permitido es ${min}.`;
        }

        if (errors['max']) {
            const max = errors['max']?.max;
            return `El valor máximo permitido es ${max}.`;
        }

        if (errors['pattern']) {
            return 'Debe contener mayúsculas, minúsculas y números.';
        }

        if (errors['soloLetras']) {
            return `El campo ${labelName} solo debe contener letras.`;
        }

        if (errors['fechaFutura']) {
            return 'La fecha debe ser igual o posterior a hoy.';
        }

        if (errors['fechaFuturaEstricta']) {
            return 'La fecha debe ser posterior a la hora actual.';
        }

        if (errors['fechaPasada']) {
            return 'La fecha de nacimiento debe ser una fecha pasada.';
        }

        if (errors['emailsMismatch']) {
            return 'Los correos no coinciden.';
        }

        if (errors['finAnteriorInicio']) {
            return 'La fecha de fin debe ser posterior a la fecha de inicio.';
        }

        return 'Campo inválido.';
    }

    /** Para campos que muestran error solo cuando han sido tocados */
    static isFieldInvalid(control: AbstractControl | null): boolean {
        return !!(control && control.touched && control.errors);
    }

    /** Para campos que muestran error cuando fueron tocados O modificados */
    static isFieldInvalidTouchedOrDirty(control: AbstractControl | null): boolean {
        return !!(control && (control.touched || control.dirty) && control.errors);
    }

    // ── Validadores reutilizables ──────────────────────────────────────────

    /** Solo letras (incluyendo acentos y ñ), espacios permitidos */
    static soloLetrasValidator(): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            if (!control.value) return null;
            const valid = /^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ ]+$/.test(control.value);
            return valid ? null : { soloLetras: true };
        };
    }

    /** La fecha seleccionada debe ser en el pasado (para fecha de nacimiento) */
    static fechaPasadaValidator(): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            if (!control.value) return null;
            const selected = new Date(control.value + 'T00:00:00');
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return selected < today ? null : { fechaPasada: true };
        };
    }

    /** La fecha seleccionada debe ser hoy o en el futuro (para date inputs) */
    static fechaFuturaValidator(): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            if (!control.value) return null;
            const selected = new Date(control.value + 'T00:00:00');
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return selected >= today ? null : { fechaFutura: true };
        };
    }

    /** La fecha-hora seleccionada debe ser estrictamente posterior a ahora (para datetime-local) */
    static fechaHoraFuturaValidator(): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            if (!control.value) return null;
            const selected = new Date(control.value);
            return selected > new Date() ? null : { fechaFuturaEstricta: true };
        };
    }

    /** Validador cross-field: fechaHoraFin debe ser posterior a fechaHoraInicio */
    static finPosteriorInicioValidator(inicioKey: string, finKey: string): ValidatorFn {
        return (group: AbstractControl): ValidationErrors | null => {
            const inicio = group.get(inicioKey)?.value;
            const fin = group.get(finKey)?.value;
            if (!inicio || !fin) return null;
            return new Date(fin) > new Date(inicio) ? null : { finAnteriorInicio: true };
        };
    }
}