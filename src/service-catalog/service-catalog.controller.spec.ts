import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { Role } from 'src/common/enums/role.enum';
import { ServiceBillingType } from 'src/common/enums/service-billing-type.enum';
import { ServiceMaterialSource } from 'src/common/enums/service-material-source.enum';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { ServiceCatalogController } from 'src/service-catalog/service-catalog.controller';
import { ServiceCatalogService } from 'src/service-catalog/service-catalog.service';

describe('ServiceCatalogController', () => {
  let controller: ServiceCatalogController;
  let rolesGuard: RolesGuard;
  const createHandler = Reflect.getOwnPropertyDescriptor(
    ServiceCatalogController.prototype,
    'create',
  )?.value as (...args: never[]) => unknown;
  const findAllHandler = Reflect.getOwnPropertyDescriptor(
    ServiceCatalogController.prototype,
    'findAll',
  )?.value as (...args: never[]) => unknown;
  const findOneHandler = Reflect.getOwnPropertyDescriptor(
    ServiceCatalogController.prototype,
    'findOne',
  )?.value as (...args: never[]) => unknown;

  const serviceCatalogServiceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    activate: jest.fn(),
    deactivate: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      controllers: [ServiceCatalogController],
      providers: [
        Reflector,
        RolesGuard,
        {
          provide: ServiceCatalogService,
          useValue: serviceCatalogServiceMock,
        },
      ],
    }).compile();

    controller = moduleRef.get(ServiceCatalogController);
    rolesGuard = moduleRef.get(RolesGuard);
  });

  it('should delegate create to the service', async () => {
    serviceCatalogServiceMock.create.mockResolvedValue({ id: 'svc-1' });

    const result = await controller.create({
      code: 'SRV-001',
      name: 'Troca de oleo',
      category: 'manutencao',
      laborPrice: 80,
      productPrice: 120,
      billingType: ServiceBillingType.PARTS_AND_LABOR,
      materialSource: ServiceMaterialSource.SHOP_SUPPLIES,
    });

    expect(serviceCatalogServiceMock.create).toHaveBeenCalled();
    expect(result).toEqual({ id: 'svc-1' });
  });

  it('should allow ADMIN to access create endpoint', () => {
    const canActivate = rolesGuard.canActivate(
      createHttpExecutionContext(createHandler, Role.ADMIN),
    );

    expect(canActivate).toBe(true);
  });

  it('should forbid MECANICO from accessing create endpoint', () => {
    expect(() =>
      rolesGuard.canActivate(createHttpExecutionContext(createHandler, Role.MECANICO)),
    ).toThrow(ForbiddenException);
  });

  it('should allow MECANICO to access listing endpoint', () => {
    const canActivate = rolesGuard.canActivate(
      createHttpExecutionContext(findAllHandler, Role.MECANICO),
    );

    expect(canActivate).toBe(true);
  });

  it('should allow FINANCEIRO to access detail endpoint', () => {
    const canActivate = rolesGuard.canActivate(
      createHttpExecutionContext(findOneHandler, Role.FINANCEIRO),
    );

    expect(canActivate).toBe(true);
  });

  it('should delegate activate and deactivate to the service', async () => {
    serviceCatalogServiceMock.activate.mockResolvedValue({ id: 'svc-1', active: true });
    serviceCatalogServiceMock.deactivate.mockResolvedValue({ id: 'svc-1', active: false });

    const activated = await controller.activate('svc-1');
    const deactivated = await controller.deactivate('svc-1');

    expect(serviceCatalogServiceMock.activate).toHaveBeenCalledWith('svc-1');
    expect(serviceCatalogServiceMock.deactivate).toHaveBeenCalledWith('svc-1');
    expect(activated.active).toBe(true);
    expect(deactivated.active).toBe(false);
  });
});

function createHttpExecutionContext(handler: (...args: never[]) => unknown, role: Role) {
  return {
    getHandler: () => handler,
    getClass: () => ServiceCatalogController,
    switchToHttp: () => ({
      getRequest: () => ({
        user: {
          sub: 'user-1',
          email: 'user@local.test',
          role,
        },
      }),
    }),
  } as never;
}
