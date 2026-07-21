const COOKIE_NAMES = {
  REFRESH: "refreshToken",
  CSRF: "csrfToken",
};

const PASSWORD_POLICY = {
  MIN_LENGTH: 8,
  MAX_LENGTH: 128,
  PATTERN: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+\-=[\]{}|;:'",.<>/\\`~])/,
  MESSAGE:
    "Password must be at least 8 characters and include uppercase, lowercase, number, and special character.",
};

const REFRESH_TOKEN_BYTES = 48;

export { COOKIE_NAMES, PASSWORD_POLICY, REFRESH_TOKEN_BYTES };
