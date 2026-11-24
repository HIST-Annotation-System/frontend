/** The API refuses shorter passwords too (backend `PASSWORD_MIN_LENGTH`). */
export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_TOO_SHORT = `Hasło musi mieć co najmniej ${PASSWORD_MIN_LENGTH} znaków.`;
