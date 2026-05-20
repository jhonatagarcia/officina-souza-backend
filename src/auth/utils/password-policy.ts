export const STRONG_PASSWORD_PATTERN = /^(?=.{8,}$)(?=.*\p{Ll})(?=.*\p{Lu})(?=.*\p{Nd}).+$/u;

export const STRONG_PASSWORD_MESSAGE =
  'password must be at least 8 characters and contain uppercase, lowercase and number';
