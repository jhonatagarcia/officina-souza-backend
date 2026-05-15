import { registerDecorator, ValidationOptions } from 'class-validator';
import { isValidCnpj } from 'src/workshops/utils/cnpj.util';

export function IsCnpj(validationOptions?: ValidationOptions) {
  return function validateCnpj(target: object, propertyName: string): void {
    registerDecorator({
      name: 'isCnpj',
      target: target.constructor,
      propertyName,
      options: {
        message: 'CNPJ invalido',
        ...validationOptions,
      },
      validator: {
        validate(value: unknown): boolean {
          if (value === null || value === undefined || value === '') return true;
          return typeof value === 'string' && isValidCnpj(value);
        },
      },
    });
  };
}
