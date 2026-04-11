import { ValidationError } from 'class-validator';

type ConstraintTranslator = (propertyPath: string, originalMessage: string) => string;

const CONSTRAINT_TRANSLATORS: Record<string, ConstraintTranslator> = {
  arrayMinSize: (propertyPath, originalMessage) => {
    const match = originalMessage.match(/at least (\d+)/);
    return `${propertyPath} deve conter pelo menos ${match?.[1] ?? '1'} item(ns)`;
  },
  isArray: (propertyPath) => `${propertyPath} deve ser uma lista`,
  isDateString: (propertyPath) => `${propertyPath} deve ser uma data valida`,
  isEmail: (propertyPath) => `${propertyPath} deve ser um e-mail valido`,
  isEnum: (propertyPath) => `${propertyPath} deve conter um valor valido`,
  isIn: (propertyPath, originalMessage) => {
    const values = originalMessage.split(':').at(1)?.trim();
    return values
      ? `${propertyPath} deve ser um dos seguintes valores: ${values}`
      : `${propertyPath} deve conter um valor valido`;
  },
  isInt: (propertyPath) => `${propertyPath} deve ser um numero inteiro`,
  isNotEmpty: (propertyPath) => `${propertyPath} nao deve estar vazio`,
  isNumber: (propertyPath) => `${propertyPath} deve ser um numero valido`,
  isString: (propertyPath) => `${propertyPath} deve ser um texto`,
  max: (propertyPath, originalMessage) => {
    const match = originalMessage.match(/not be greater than (\d+)/);
    return `${propertyPath} deve ser menor ou igual a ${match?.[1] ?? 'o valor maximo permitido'}`;
  },
  maxLength: (propertyPath, originalMessage) => {
    const match = originalMessage.match(/shorter than or equal to (\d+)/);
    return `${propertyPath} deve ter no maximo ${match?.[1] ?? ''} caracteres`.trim();
  },
  min: (propertyPath, originalMessage) => {
    const match = originalMessage.match(/not be less than (\d+)/);
    return `${propertyPath} deve ser maior ou igual a ${match?.[1] ?? 'o valor minimo permitido'}`;
  },
  minLength: (propertyPath, originalMessage) => {
    const match = originalMessage.match(/longer than or equal to (\d+)/);
    return `${propertyPath} deve ter no minimo ${match?.[1] ?? ''} caracteres`.trim();
  },
  nestedValidation: (propertyPath) => `${propertyPath} contem dados invalidos`,
  whitelistValidation: (propertyPath) => `${propertyPath} nao e permitido`,
};

function buildPropertyPath(parentPath: string, property: string): string {
  if (!parentPath) {
    return property;
  }

  return /^\d+$/.test(property) ? `${parentPath}[${property}]` : `${parentPath}.${property}`;
}

function translateConstraint(
  constraint: string,
  propertyPath: string,
  originalMessage: string,
): string {
  const translator = CONSTRAINT_TRANSLATORS[constraint];
  return translator ? translator(propertyPath, originalMessage) : originalMessage;
}

function collectValidationMessages(errors: ValidationError[], parentPath = ''): string[] {
  return errors.flatMap((error) => {
    const propertyPath = buildPropertyPath(parentPath, error.property);
    const messages = Object.entries(error.constraints ?? {}).map(([constraint, message]) =>
      translateConstraint(constraint, propertyPath, message),
    );

    return [...messages, ...collectValidationMessages(error.children ?? [], propertyPath)];
  });
}

export function formatValidationMessages(errors: ValidationError[]): string[] {
  const messages = collectValidationMessages(errors);
  return messages.length > 0 ? messages : ['Dados de validacao invalidos'];
}
