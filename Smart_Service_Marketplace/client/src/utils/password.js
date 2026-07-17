const PASSWORD_PATTERN =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+\-=[\]{}|;:'",.<>/\\`~])/;

export const PASSWORD_RULES = {
  minLength: 8,
  message:
    "Password must be at least 8 characters and include uppercase, lowercase, number, and special character.",
  pattern: PASSWORD_PATTERN,
};

export function validateStrongPassword(value) {
  if (!value || value.length < PASSWORD_RULES.minLength) {
    return PASSWORD_RULES.message;
  }

  if (!PASSWORD_RULES.pattern.test(value)) {
    return PASSWORD_RULES.message;
  }

  return true;
}

export function getPasswordChecks(password = "") {
  return {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
}

export default {
  PASSWORD_RULES,
  validateStrongPassword,
  getPasswordChecks,
};
