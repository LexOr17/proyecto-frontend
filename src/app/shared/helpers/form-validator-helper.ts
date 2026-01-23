import { AbstractControl, ValidationErrors } from '@angular/forms';

export class FormValidatorHelper {
    // Recibe el control y un nombre "humano" para el mensaje
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

        // Puedes agregar más validaciones aquí (pattern, max, etc.)

        return 'Campo inválido.';
    }

    static isFieldInvalid(control: AbstractControl | null): boolean {
        // Retorna true solo si el control existe, ha sido tocado y tiene errores
        return !!(control && control.touched && control.errors);
    }


    // static getErrorMessage(control: AbstractControl | null, labelName: string): string | null {
    //     if (!control || !control.errors || !control.touched) {
    //         return null;
    //     }

    //     const errors = control.errors;

    //     if (errors['required']) {
    //         return `El campo ${labelName} es requerido.`;
    //     }
    //     if (errors['email']) {
    //         return `Ingresa un formato de correo válido.`;
    //     }
    //     if (errors['minlength']) {
    //         return `Mínimo ${errors['minlength'].requiredLength} caracteres.`;
    //     }

    //     return 'Campo inválido.';
    // }

    // static isFieldInvalid(control: AbstractControl | null): boolean {
    //     return !!(control && control.touched && control.errors);
    // }
}