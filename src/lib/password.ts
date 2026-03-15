/**
 * Validates a password against the SGC complexity rules:
 * - At least 12 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one special character (e.g., #)
 */
export function validatePasswordComplexity(password: string): { isValid: boolean; message: string } {
    if (password.length < 12) {
        return { isValid: false, message: 'A senha deve ter no mínimo 12 caracteres.' };
    }
    if (!/[A-Z]/.test(password)) {
        return { isValid: false, message: 'A senha deve incluir pelo menos uma letra maiúscula.' };
    }
    if (!/[a-z]/.test(password)) {
        return { isValid: false, message: 'A senha deve incluir pelo menos uma letra minúscula.' };
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        return { isValid: false, message: 'A senha deve incluir pelo menos um caractere especial (!@#$%^&*).' };
    }
    return { isValid: true, message: '' };
}
