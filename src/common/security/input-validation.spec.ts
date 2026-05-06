import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateFinancialEntryDto } from 'src/financial/dto/create-financial-entry.dto';
import { AddServiceOrderPartDto } from 'src/service-orders/dto/add-service-order-part.dto';
import { CreateServiceOrderDto } from 'src/service-orders/dto/create-service-order.dto';
import { CreateUserDto } from 'src/users/dto/create-user.dto';

async function validateDto<T extends object>(dto: new () => T, payload: Record<string, unknown>) {
  return validate(plainToInstance(dto, payload), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
}

describe('security input validation', () => {
  it('should reject non-UUID identifiers in service order creation', async () => {
    const errors = await validateDto(CreateServiceOrderDto, {
      clientId: 'client-1',
      vehicleId: 'vehicle-1',
      problemDescription: 'Motor falhando',
    });

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['clientId', 'vehicleId']),
    );
  });

  it('should reject non-UUID inventory item identifier when adding service order parts', async () => {
    const errors = await validateDto(AddServiceOrderPartDto, {
      inventoryItemId: 'item-1',
      quantity: 1,
      unitPrice: 100,
    });

    expect(errors.map((error) => error.property)).toContain('inventoryItemId');
  });

  it('should reject non-UUID financial references', async () => {
    const errors = await validateDto(CreateFinancialEntryDto, {
      type: 'RECEIVABLE',
      description: 'Cobranca',
      category: 'Servico',
      amount: 100,
      dueDate: '2026-05-01T00:00:00.000Z',
      clientId: 'client-1',
      serviceOrderId: 'os-1',
    });

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['clientId', 'serviceOrderId']),
    );
  });

  it('should reject financial status on create payloads', async () => {
    const errors = await validateDto(CreateFinancialEntryDto, {
      type: 'RECEIVABLE',
      description: 'Cobranca',
      category: 'Servico',
      amount: 100,
      dueDate: '2026-05-01T00:00:00.000Z',
      status: 'PAGO',
    });

    expect(errors.map((error) => error.property)).toContain('status');
  });

  it('should require stronger passwords for internal users', async () => {
    const errors = await validateDto(CreateUserDto, {
      name: 'Admin',
      email: 'admin@example.com',
      password: 'password',
      role: 'ADMIN',
    });

    expect(errors.map((error) => error.property)).toContain('password');
  });
});
