import { AbstractControl, ValidationErrors } from '@angular/forms';

export class FormValidatorHelper {
    static getErrorMessage(control: AbstractControl | null, labelName: string): string {
        if (!control || !control.errors || !control.touched) {
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

        if (errors['pattern']) {
            return 'Debe contener mayúsculas, minúsculas y números.';
        }

        return 'Campo inválido.';
    }

    static isFieldInvalid(control: AbstractControl | null): boolean {
        return !!(control && control.touched && control.errors);
    }
}