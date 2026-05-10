import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import {
  type Budget,
  BudgetItemType,
  BudgetStatus,
  FinancialEntryType,
  FinancialStatus,
  type InventoryItem,
  PaymentMethod,
  Prisma,
  PrismaClient,
  Role,
  ServiceBillingType,
  type ServiceCatalogItem,
  ServiceMaterialSource,
  ServiceOrderStatus,
} from '@prisma/client';

const prisma = new PrismaClient();

const now = new Date();

function daysFromNow(days: number): Date {
  const date = new Date(now);
  date.setDate(date.getDate() + days);
  date.setHours(10, 0, 0, 0);
  return date;
}

function money(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

function byIndex<T>(items: T[], index: number): T {
  const item = items[index];

  if (!item) {
    throw new Error(`Demo seed reference not found at index ${index}.`);
  }

  return item;
}

type ClientSeed = [name: string, document: string, phone: string, email: string, notes: string];
type VehicleSeed = [
  clientIndex: number,
  plate: string,
  brand: string,
  model: string,
  year: number,
  color: string,
  mileage: number,
  fuel: string,
  notes: string,
];
type InventorySeed = [
  internalCode: string,
  name: string,
  category: string,
  supplier: string,
  quantity: number,
  minimumQuantity: number,
  cost: number,
  salePrice: number,
];
type ServiceSeed = [
  code: string,
  name: string,
  category: string,
  laborPrice: number,
  productPrice: number,
  billingType: ServiceBillingType,
  materialSource: ServiceMaterialSource,
  warrantyDays: number,
];
interface BudgetLineSeed {
  service: ServiceCatalogItem | null;
  inventory: InventoryItem | null;
  type: BudgetItemType;
  quantity: number;
  unitPrice: number;
}
interface BudgetSeed {
  code: string;
  clientIndex: number;
  vehicleIndex: number;
  status: BudgetStatus;
  discount: number;
  approvedAt?: Date;
  rejectedAt?: Date;
  problemDescription: string;
  items: BudgetLineSeed[];
}
type OrderPartSeed = [itemIndex: number, quantity: number, unitPrice: number];
interface OrderSeed {
  orderNumber: string;
  budgetIndex?: number;
  clientIndex: number;
  vehicleIndex: number;
  status: ServiceOrderStatus;
  openedDays: number;
  expectedDays: number;
  finishedDays?: number;
  deliveredDays?: number;
  diagnosis: string;
  servicesPerformed: string | null;
  parts: OrderPartSeed[];
}
type FinancialSeed = [
  id: string,
  type: FinancialEntryType,
  description: string,
  category: string,
  amount: number,
  dueDays: number,
  paidDays: number | null,
  status: FinancialStatus,
  paymentMethod: PaymentMethod | null,
  clientIndex: number | null,
  orderNumber: string | null,
];

async function main(): Promise<void> {
  const demoPasswordHash = await bcrypt.hash('Demo@123456', 10);

  await prisma.user.upsert({
    where: { email: 'demo.admin@oficina.local' },
    update: { passwordHash: demoPasswordHash },
    create: {
      name: 'Marina Costa',
      email: 'demo.admin@oficina.local',
      passwordHash: demoPasswordHash,
      role: Role.ADMIN,
    },
  });

  const mechanic = await prisma.user.upsert({
    where: { email: 'demo.mecanico@oficina.local' },
    update: { passwordHash: demoPasswordHash },
    create: {
      name: 'Rafael Almeida',
      email: 'demo.mecanico@oficina.local',
      passwordHash: demoPasswordHash,
      role: Role.MECANICO,
    },
  });

  const clients = await Promise.all(
    (
      [
        [
          'Ana Paula Ribeiro',
          '32981654012',
          '11987654321',
          'ana.ribeiro@email.com',
          'Prefere contato por WhatsApp no fim da tarde.',
        ],
        [
          'Bruno Martins Ferreira',
          '84190235004',
          '11992345678',
          'bruno.martins@email.com',
          'Cliente recorrente, autoriza revisoes preventivas.',
        ],
        [
          'Carolina Mendes Lima',
          '21436587099',
          '21984561234',
          'carolina.mendes@email.com',
          'Usa o carro diariamente para trabalho.',
        ],
        [
          'Diego Oliveira Santos',
          '57031824016',
          '31988776655',
          'diego.oliveira@email.com',
          'Solicita sempre orcamento antes de executar servicos extras.',
        ],
        [
          'Eduarda Nogueira Alves',
          '69045123087',
          '41999887766',
          'eduarda.alves@email.com',
          'Veiculo fica disponivel pela manha.',
        ],
        [
          'Felipe Rocha Souza',
          '75395184022',
          '11993456789',
          'felipe.rocha@email.com',
          'Historico de manutencao preventiva em dia.',
        ],
        [
          'Gabriela Pires Cardoso',
          '48201693055',
          '21991234567',
          'gabriela.pires@email.com',
          'Atendimento preferencial por e-mail.',
        ],
        [
          'Henrique Torres Barros',
          '30571964018',
          '31997654321',
          'henrique.torres@email.com',
          'Cliente cadastrado para frota familiar.',
        ],
        [
          'Instituto Vida Plena Ltda',
          '12874563000190',
          '1133445566',
          'financeiro@vidaplena.org',
          'Frota institucional com pagamento por boleto.',
        ],
        [
          'Logistica Serra Azul Ltda',
          '45781239000166',
          '3133221100',
          'manutencao@serraazul.com',
          'Atendimento recorrente para veiculos utilitarios.',
        ],
      ] satisfies ClientSeed[]
    ).map(([name, document, phone, email, notes]) =>
      prisma.client.upsert({
        where: { document },
        update: {},
        create: { name, document, phone, email, notes },
      }),
    ),
  );

  const vehicles = await Promise.all(
    (
      [
        [
          0,
          'QPA1B23',
          'Toyota',
          'Corolla XEi',
          2020,
          'Prata',
          68400,
          'Flex',
          'Revisoes feitas a cada 10 mil km.',
        ],
        [
          1,
          'RFS4D56',
          'Honda',
          'Civic Touring',
          2019,
          'Cinza',
          73500,
          'Flex',
          'Cliente relata vibracao em frenagens longas.',
        ],
        [
          2,
          'LMD8F10',
          'Jeep',
          'Renegade Longitude',
          2021,
          'Branco',
          51200,
          'Flex',
          'Uso urbano intenso.',
        ],
        [
          3,
          'HJK2C45',
          'Volkswagen',
          'T-Cross Comfortline',
          2022,
          'Azul',
          38600,
          'Flex',
          'Garantia de pneus em acompanhamento.',
        ],
        [
          4,
          'BRT9E87',
          'Chevrolet',
          'Onix Premier',
          2020,
          'Vermelho',
          62200,
          'Flex',
          'Ultima troca de oleo registrada na oficina.',
        ],
        [
          5,
          'NVA6G32',
          'Fiat',
          'Toro Freedom',
          2021,
          'Preto',
          80400,
          'Diesel',
          'Veiculo utilizado em viagens semanais.',
        ],
        [
          6,
          'KPL3H91',
          'Hyundai',
          'HB20 Comfort',
          2018,
          'Prata',
          91200,
          'Flex',
          'Necessita revisao de suspensao periodica.',
        ],
        [
          7,
          'MZO7J44',
          'Renault',
          'Duster Iconic',
          2022,
          'Verde',
          34400,
          'Flex',
          'Cliente solicita check-list detalhado.',
        ],
        [
          8,
          'VID2A19',
          'Chevrolet',
          'Spin LTZ',
          2020,
          'Branco',
          104200,
          'Flex',
          'Veiculo da frota institucional.',
        ],
        [
          9,
          'LSA5C72',
          'Fiat',
          'Ducato Cargo',
          2019,
          'Branco',
          138500,
          'Diesel',
          'Utilitario de entregas urbanas.',
        ],
      ] satisfies VehicleSeed[]
    ).map(([clientIndex, plate, brand, model, year, color, mileage, fuel, notes]) =>
      prisma.vehicle.upsert({
        where: { plate: String(plate) },
        update: {},
        create: {
          clientId: byIndex(clients, clientIndex).id,
          plate: String(plate),
          brand: String(brand),
          model: String(model),
          year: Number(year),
          color: String(color),
          mileage: Number(mileage),
          fuel: String(fuel),
          notes: String(notes),
        },
      }),
    ),
  );

  const inventoryItems = await Promise.all(
    (
      [
        ['DEMO-FILT-OLEO-001', 'Filtro de oleo Wega WO120', 'Filtros', 'Wega', 18, 6, 28.9, 54.9],
        [
          'DEMO-OLEO-5W30-001',
          'Oleo sintetico 5W30 API SN 1L',
          'Lubrificantes',
          'Mobil',
          36,
          12,
          38.5,
          69.9,
        ],
        [
          'DEMO-PAST-FREIO-001',
          'Pastilha de freio dianteira Bosch',
          'Freios',
          'Bosch',
          7,
          4,
          118.0,
          219.9,
        ],
        [
          'DEMO-DISCO-FREIO-001',
          'Disco de freio ventilado Fremax',
          'Freios',
          'Fremax',
          5,
          3,
          168.0,
          289.9,
        ],
        ['DEMO-VELA-IGN-001', 'Jogo de velas de ignicao NGK', 'Ignicao', 'NGK', 12, 5, 84.0, 159.9],
        ['DEMO-BAT-60AH-001', 'Bateria Moura 60Ah', 'Eletrica', 'Moura', 3, 3, 389.0, 589.0],
        [
          'DEMO-AMORT-D-001',
          'Amortecedor dianteiro Nakata',
          'Suspensao',
          'Nakata',
          4,
          4,
          246.0,
          419.0,
        ],
        ['DEMO-KIT-CORR-001', 'Kit correia dentada Gates', 'Motor', 'Gates', 6, 3, 212.0, 389.0],
        ['DEMO-FILT-AR-001', 'Filtro de ar Tecfil', 'Filtros', 'Tecfil', 16, 6, 34.0, 69.9],
        [
          'DEMO-FILT-CAB-001',
          'Filtro de cabine com carvao ativado',
          'Filtros',
          'Tecfil',
          9,
          4,
          42.0,
          89.9,
        ],
        [
          'DEMO-PALHETA-001',
          'Palheta limpador par dianteiro',
          'Acessorios',
          'Dyna',
          11,
          5,
          49.0,
          99.9,
        ],
        [
          'DEMO-ADIT-RAD-001',
          'Aditivo para radiador concentrado',
          'Arrefecimento',
          'Paraflu',
          14,
          6,
          22.0,
          49.9,
        ],
        ['DEMO-LAMP-H7-001', 'Lampada H7 super branca', 'Eletrica', 'Osram', 2, 4, 46.0, 89.9],
        [
          'DEMO-SENSOR-O2-001',
          'Sonda lambda Bosch',
          'Injecao Eletronica',
          'Bosch',
          2,
          2,
          196.0,
          349.0,
        ],
        [
          'DEMO-PNEU-20555-001',
          'Pneu 205/55 R16 Michelin Primacy',
          'Pneus',
          'Michelin',
          8,
          4,
          438.0,
          689.0,
        ],
      ] satisfies InventorySeed[]
    ).map(([internalCode, name, category, supplier, quantity, minimumQuantity, cost, salePrice]) =>
      prisma.inventoryItem.upsert({
        where: { internalCode: String(internalCode) },
        update: {},
        create: {
          internalCode: String(internalCode),
          name: String(name),
          category: String(category),
          supplier: String(supplier),
          quantity: Number(quantity),
          minimumQuantity: Number(minimumQuantity),
          cost: money(Number(cost)),
          salePrice: money(Number(salePrice)),
        },
      }),
    ),
  );

  const services = await Promise.all(
    (
      [
        [
          'DEMO-REV-001',
          'Revisao preventiva completa',
          'Revisao',
          360,
          0,
          ServiceBillingType.LABOR_ONLY,
          ServiceMaterialSource.NO_PARTS_REQUIRED,
          90,
        ],
        [
          'DEMO-FRE-001',
          'Troca de pastilhas de freio dianteiras',
          'Freios',
          180,
          219.9,
          ServiceBillingType.PARTS_AND_LABOR,
          ServiceMaterialSource.SHOP_SUPPLIES,
          90,
        ],
        [
          'DEMO-SUS-001',
          'Diagnostico e reparo de suspensao',
          'Suspensao',
          280,
          0,
          ServiceBillingType.LABOR_ONLY,
          ServiceMaterialSource.FLEXIBLE,
          60,
        ],
        [
          'DEMO-OLE-001',
          'Troca de oleo e filtros',
          'Motor',
          120,
          0,
          ServiceBillingType.PARTS_AND_LABOR,
          ServiceMaterialSource.SHOP_SUPPLIES,
          90,
        ],
        [
          'DEMO-ELT-001',
          'Diagnostico eletrico com scanner',
          'Eletrica',
          190,
          0,
          ServiceBillingType.FIXED_PRICE,
          ServiceMaterialSource.NO_PARTS_REQUIRED,
          30,
        ],
        [
          'DEMO-ARR-001',
          'Limpeza do sistema de arrefecimento',
          'Arrefecimento',
          240,
          99.8,
          ServiceBillingType.PARTS_AND_LABOR,
          ServiceMaterialSource.SHOP_SUPPLIES,
          60,
        ],
        [
          'DEMO-INJ-001',
          'Limpeza de bicos injetores',
          'Injecao Eletronica',
          260,
          0,
          ServiceBillingType.FIXED_PRICE,
          ServiceMaterialSource.NO_PARTS_REQUIRED,
          60,
        ],
        [
          'DEMO-COR-001',
          'Substituicao de correia dentada',
          'Motor',
          420,
          389,
          ServiceBillingType.PARTS_AND_LABOR,
          ServiceMaterialSource.SHOP_SUPPLIES,
          180,
        ],
      ] satisfies ServiceSeed[]
    ).map(
      ([
        code,
        name,
        category,
        laborPrice,
        productPrice,
        billingType,
        materialSource,
        warrantyDays,
      ]) =>
        prisma.serviceCatalogItem.upsert({
          where: { code: String(code) },
          update: {},
          create: {
            code: String(code),
            name: String(name),
            category: String(category),
            description: String(name),
            laborPrice: money(Number(laborPrice)),
            productPrice: money(Number(productPrice)),
            suggestedTotalPrice: money(Number(laborPrice) + Number(productPrice)),
            billingType,
            materialSource,
            warrantyDays: Number(warrantyDays),
            active: true,
          },
        }),
    ),
  );

  const budgetDefinitions: BudgetSeed[] = [
    {
      code: 'DEMO-ORC-2026-001',
      clientIndex: 0,
      vehicleIndex: 0,
      status: BudgetStatus.APROVADO,
      discount: 80,
      approvedAt: daysFromNow(-8),
      problemDescription: 'Revisao de 70 mil km com troca de oleo e filtros.',
      items: [
        {
          service: byIndex(services, 3),
          inventory: null,
          type: BudgetItemType.LABOR_AND_PART,
          quantity: 1,
          unitPrice: 120,
        },
        {
          service: null,
          inventory: byIndex(inventoryItems, 0),
          type: BudgetItemType.PART,
          quantity: 1,
          unitPrice: 54.9,
        },
        {
          service: null,
          inventory: byIndex(inventoryItems, 1),
          type: BudgetItemType.PART,
          quantity: 4,
          unitPrice: 69.9,
        },
      ],
    },
    {
      code: 'DEMO-ORC-2026-002',
      clientIndex: 1,
      vehicleIndex: 1,
      status: BudgetStatus.PENDENTE,
      discount: 0,
      problemDescription: 'Vibracao ao frear em rodovia.',
      items: [
        {
          service: byIndex(services, 1),
          inventory: byIndex(inventoryItems, 2),
          type: BudgetItemType.LABOR_AND_PART,
          quantity: 1,
          unitPrice: 399.9,
        },
        {
          service: null,
          inventory: byIndex(inventoryItems, 3),
          type: BudgetItemType.PART,
          quantity: 2,
          unitPrice: 289.9,
        },
      ],
    },
    {
      code: 'DEMO-ORC-2026-003',
      clientIndex: 2,
      vehicleIndex: 2,
      status: BudgetStatus.APROVADO,
      discount: 120,
      approvedAt: daysFromNow(-5),
      problemDescription: 'Troca preventiva de correia dentada e inspecao do motor.',
      items: [
        {
          service: byIndex(services, 7),
          inventory: byIndex(inventoryItems, 7),
          type: BudgetItemType.LABOR_AND_PART,
          quantity: 1,
          unitPrice: 809,
        },
        {
          service: byIndex(services, 4),
          inventory: null,
          type: BudgetItemType.LABOR,
          quantity: 1,
          unitPrice: 190,
        },
      ],
    },
    {
      code: 'DEMO-ORC-2026-004',
      clientIndex: 3,
      vehicleIndex: 3,
      status: BudgetStatus.REPROVADO,
      discount: 0,
      rejectedAt: daysFromNow(-2),
      problemDescription: 'Cliente solicitou cotacao para troca dos quatro pneus.',
      items: [
        {
          service: null,
          inventory: byIndex(inventoryItems, 14),
          type: BudgetItemType.PART,
          quantity: 4,
          unitPrice: 689,
        },
        {
          service: byIndex(services, 2),
          inventory: null,
          type: BudgetItemType.LABOR,
          quantity: 1,
          unitPrice: 180,
        },
      ],
    },
    {
      code: 'DEMO-ORC-2026-005',
      clientIndex: 4,
      vehicleIndex: 4,
      status: BudgetStatus.PENDENTE,
      discount: 50,
      problemDescription: 'Luz da injecao acesa e oscilacao em marcha lenta.',
      items: [
        {
          service: byIndex(services, 4),
          inventory: null,
          type: BudgetItemType.LABOR,
          quantity: 1,
          unitPrice: 190,
        },
        {
          service: byIndex(services, 6),
          inventory: null,
          type: BudgetItemType.LABOR,
          quantity: 1,
          unitPrice: 260,
        },
        {
          service: null,
          inventory: byIndex(inventoryItems, 13),
          type: BudgetItemType.PART,
          quantity: 1,
          unitPrice: 349,
        },
      ],
    },
    {
      code: 'DEMO-ORC-2026-006',
      clientIndex: 5,
      vehicleIndex: 5,
      status: BudgetStatus.APROVADO,
      discount: 150,
      approvedAt: daysFromNow(-12),
      problemDescription: 'Revisao para viagem com verificacao de freios e arrefecimento.',
      items: [
        {
          service: byIndex(services, 0),
          inventory: null,
          type: BudgetItemType.LABOR,
          quantity: 1,
          unitPrice: 360,
        },
        {
          service: byIndex(services, 5),
          inventory: byIndex(inventoryItems, 11),
          type: BudgetItemType.LABOR_AND_PART,
          quantity: 2,
          unitPrice: 169.9,
        },
        {
          service: null,
          inventory: byIndex(inventoryItems, 10),
          type: BudgetItemType.PART,
          quantity: 1,
          unitPrice: 99.9,
        },
      ],
    },
    {
      code: 'DEMO-ORC-2026-007',
      clientIndex: 8,
      vehicleIndex: 8,
      status: BudgetStatus.PENDENTE,
      discount: 0,
      problemDescription: 'Manutencao preventiva de veiculo da frota institucional.',
      items: [
        {
          service: byIndex(services, 0),
          inventory: null,
          type: BudgetItemType.LABOR,
          quantity: 1,
          unitPrice: 360,
        },
        {
          service: null,
          inventory: byIndex(inventoryItems, 8),
          type: BudgetItemType.PART,
          quantity: 1,
          unitPrice: 69.9,
        },
        {
          service: null,
          inventory: byIndex(inventoryItems, 9),
          type: BudgetItemType.PART,
          quantity: 1,
          unitPrice: 89.9,
        },
      ],
    },
    {
      code: 'DEMO-ORC-2026-008',
      clientIndex: 9,
      vehicleIndex: 9,
      status: BudgetStatus.APROVADO,
      discount: 200,
      approvedAt: daysFromNow(-20),
      problemDescription: 'Utilitario com perda de potencia e revisao pesada.',
      items: [
        {
          service: byIndex(services, 4),
          inventory: null,
          type: BudgetItemType.LABOR,
          quantity: 1,
          unitPrice: 190,
        },
        {
          service: byIndex(services, 7),
          inventory: byIndex(inventoryItems, 7),
          type: BudgetItemType.LABOR_AND_PART,
          quantity: 1,
          unitPrice: 809,
        },
        {
          service: null,
          inventory: byIndex(inventoryItems, 5),
          type: BudgetItemType.PART,
          quantity: 1,
          unitPrice: 589,
        },
      ],
    },
  ];

  const budgets: Budget[] = [];
  for (const definition of budgetDefinitions) {
    const subtotal = definition.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    );
    const budget = await prisma.budget.upsert({
      where: { code: definition.code },
      update: {},
      create: {
        code: definition.code,
        clientId: byIndex(clients, definition.clientIndex).id,
        vehicleId: byIndex(vehicles, definition.vehicleIndex).id,
        status: definition.status,
        problemDescription: definition.problemDescription,
        notes: 'Registro de demonstracao para ambiente local.',
        subtotal: money(subtotal),
        discount: money(definition.discount),
        total: money(subtotal - definition.discount),
        approvedAt: definition.approvedAt,
        rejectedAt: definition.rejectedAt,
        items: {
          create: definition.items.map((item) => ({
            serviceCatalogItemId: item.service?.id,
            inventoryItemId: item.inventory?.id,
            type: item.type,
            serviceCode: item.service?.code,
            description: item.service?.name ?? item.inventory?.name ?? 'Item de demonstracao',
            quantity: item.quantity,
            unitPrice: money(item.unitPrice),
            totalPrice: money(item.unitPrice * item.quantity),
          })),
        },
      },
    });
    budgets.push(budget);
  }

  const orderDefinitions: OrderSeed[] = [
    {
      orderNumber: 'OS-DEMO-2026-001',
      budgetIndex: 0,
      clientIndex: 0,
      vehicleIndex: 0,
      status: ServiceOrderStatus.ENTREGUE,
      openedDays: -9,
      finishedDays: -7,
      deliveredDays: -6,
      expectedDays: -6,
      diagnosis: 'Oleo vencido, filtros saturados e checklist sem falhas criticas.',
      servicesPerformed: 'Troca de oleo sintetico, filtro de oleo e revisao preventiva.',
      parts: [
        [0, 1, 54.9],
        [1, 4, 69.9],
      ],
    },
    {
      orderNumber: 'OS-DEMO-2026-002',
      budgetIndex: 2,
      clientIndex: 2,
      vehicleIndex: 2,
      status: ServiceOrderStatus.FINALIZADA,
      openedDays: -5,
      finishedDays: -1,
      expectedDays: 0,
      diagnosis: 'Correia dentada no fim da vida util e falha registrada no scanner.',
      servicesPerformed: 'Substituicao da correia dentada, scanner e teste de rodagem.',
      parts: [[7, 1, 389]],
    },
    {
      orderNumber: 'OS-DEMO-2026-003',
      budgetIndex: 5,
      clientIndex: 5,
      vehicleIndex: 5,
      status: ServiceOrderStatus.EM_ANDAMENTO,
      openedDays: -3,
      expectedDays: 2,
      diagnosis: 'Sistema de arrefecimento com fluido degradado.',
      servicesPerformed: 'Limpeza em andamento e revisao de freios.',
      parts: [
        [11, 2, 49.9],
        [10, 1, 99.9],
      ],
    },
    {
      orderNumber: 'OS-DEMO-2026-004',
      budgetIndex: 7,
      clientIndex: 9,
      vehicleIndex: 9,
      status: ServiceOrderStatus.ABERTA,
      openedDays: -1,
      expectedDays: 4,
      diagnosis: 'Aguardando desmontagem para confirmacao do diagnostico.',
      servicesPerformed: null,
      parts: [],
    },
    {
      orderNumber: 'OS-DEMO-2026-005',
      clientIndex: 6,
      vehicleIndex: 6,
      status: ServiceOrderStatus.EM_ANDAMENTO,
      openedDays: -2,
      expectedDays: 1,
      diagnosis: 'Ruido na dianteira direita, buchas e amortecedor com folga.',
      servicesPerformed: 'Inspecao de suspensao iniciada.',
      parts: [[6, 2, 419]],
    },
    {
      orderNumber: 'OS-DEMO-2026-006',
      clientIndex: 7,
      vehicleIndex: 7,
      status: ServiceOrderStatus.FINALIZADA,
      openedDays: -6,
      finishedDays: -2,
      expectedDays: -1,
      diagnosis: 'Lampada queimada e bateria com baixa capacidade de partida.',
      servicesPerformed: 'Teste eletrico, troca de lampada e revisao de carga.',
      parts: [[12, 1, 89.9]],
    },
    {
      orderNumber: 'OS-DEMO-2026-007',
      clientIndex: 8,
      vehicleIndex: 8,
      status: ServiceOrderStatus.ABERTA,
      openedDays: 0,
      expectedDays: 3,
      diagnosis: 'Entrada para revisao preventiva de frota.',
      servicesPerformed: null,
      parts: [],
    },
  ];

  for (const definition of orderDefinitions) {
    const serviceOrder = await prisma.serviceOrder.upsert({
      where: { orderNumber: definition.orderNumber },
      update: {},
      create: {
        orderNumber: definition.orderNumber,
        budgetId:
          definition.budgetIndex !== undefined
            ? byIndex(budgets, definition.budgetIndex).id
            : undefined,
        clientId: byIndex(clients, definition.clientIndex).id,
        vehicleId: byIndex(vehicles, definition.vehicleIndex).id,
        mechanicId: mechanic.id,
        problemDescription: definition.diagnosis,
        diagnosis: definition.diagnosis,
        servicesPerformed: definition.servicesPerformed,
        vehicleChecklist: 'Pneus, freios, iluminacao, fluidos e itens de seguranca verificados.',
        openedAt: daysFromNow(definition.openedDays),
        expectedDeliveryAt: daysFromNow(definition.expectedDays),
        finishedAt: definition.finishedDays ? daysFromNow(definition.finishedDays) : undefined,
        deliveredAt: definition.deliveredDays ? daysFromNow(definition.deliveredDays) : undefined,
        status: definition.status,
        notes: 'Ordem de servico de demonstracao com dados coerentes para apresentacao.',
      },
    });

    if (definition.budgetIndex !== undefined) {
      await prisma.budget.update({
        where: { id: byIndex(budgets, definition.budgetIndex).id },
        data: { convertedToServiceOrder: true },
      });
    }

    for (const [itemIndex, quantity, unitPrice] of definition.parts) {
      await prisma.serviceOrderPart.upsert({
        where: {
          serviceOrderId_inventoryItemId: {
            serviceOrderId: serviceOrder.id,
            inventoryItemId: byIndex(inventoryItems, itemIndex).id,
          },
        },
        update: {},
        create: {
          serviceOrderId: serviceOrder.id,
          inventoryItemId: byIndex(inventoryItems, itemIndex).id,
          quantity,
          unitPrice: money(unitPrice),
          totalPrice: money(quantity * unitPrice),
        },
      });
    }

    await prisma.vehicleHistory.upsert({
      where: { serviceOrderId: serviceOrder.id },
      update: {},
      create: {
        vehicleId: byIndex(vehicles, definition.vehicleIndex).id,
        serviceOrderId: serviceOrder.id,
        entryDate: definition.deliveredDays
          ? daysFromNow(definition.deliveredDays)
          : daysFromNow(definition.openedDays),
        mileage: byIndex(vehicles, definition.vehicleIndex).mileage,
        servicesSummary: definition.servicesPerformed ?? definition.diagnosis,
        partsSummary: definition.parts.length
          ? `${definition.parts.length} item(ns) aplicado(s)`
          : null,
        totalAmount: definition.parts.length
          ? money(
              definition.parts.reduce(
                (sum, [, quantity, unitPrice]) => sum + quantity * unitPrice,
                0,
              ),
            )
          : null,
      },
    });
  }

  const orders = await prisma.serviceOrder.findMany({
    where: { orderNumber: { startsWith: 'OS-DEMO-' } },
  });
  const orderByNumber = new Map(orders.map((order) => [order.orderNumber, order]));

  const financialEntries: FinancialSeed[] = [
    [
      '00000000-0000-4000-8000-000000000001',
      FinancialEntryType.RECEIVABLE,
      'Recebimento OS-DEMO-2026-001 - revisao Corolla',
      'Servicos',
      474.5,
      -5,
      -5,
      FinancialStatus.PAGO,
      PaymentMethod.PIX,
      0,
      'OS-DEMO-2026-001',
    ],
    [
      '00000000-0000-4000-8000-000000000002',
      FinancialEntryType.RECEIVABLE,
      'A receber OS-DEMO-2026-002 - correia Renegade',
      'Servicos',
      879.0,
      3,
      null,
      FinancialStatus.PENDENTE,
      null,
      2,
      'OS-DEMO-2026-002',
    ],
    [
      '00000000-0000-4000-8000-000000000003',
      FinancialEntryType.RECEIVABLE,
      'Sinal OS-DEMO-2026-003 - revisao Toro',
      'Servicos',
      350.0,
      -1,
      -1,
      FinancialStatus.PAGO,
      PaymentMethod.CARTAO_DEBITO,
      5,
      'OS-DEMO-2026-003',
    ],
    [
      '00000000-0000-4000-8000-000000000004',
      FinancialEntryType.RECEIVABLE,
      'Parcela pendente Ducato Cargo',
      'Servicos',
      950.0,
      5,
      null,
      FinancialStatus.PENDENTE,
      null,
      9,
      'OS-DEMO-2026-004',
    ],
    [
      '00000000-0000-4000-8000-000000000005',
      FinancialEntryType.RECEIVABLE,
      'Orcamento aprovado suspensao HB20',
      'Servicos',
      1118.0,
      -2,
      null,
      FinancialStatus.VENCIDO,
      null,
      6,
      'OS-DEMO-2026-005',
    ],
    [
      '00000000-0000-4000-8000-000000000006',
      FinancialEntryType.RECEIVABLE,
      'Recebimento diagnostico eletrico Duster',
      'Servicos',
      279.9,
      -2,
      -2,
      FinancialStatus.PAGO,
      PaymentMethod.PIX,
      7,
      'OS-DEMO-2026-006',
    ],
    [
      '00000000-0000-4000-8000-000000000007',
      FinancialEntryType.PAYABLE,
      'Compra de filtros e lubrificantes',
      'Estoque',
      1280.0,
      7,
      null,
      FinancialStatus.PENDENTE,
      null,
      null,
      null,
    ],
    [
      '00000000-0000-4000-8000-000000000008',
      FinancialEntryType.PAYABLE,
      'Fornecedor Bosch - freios',
      'Estoque',
      1690.0,
      -3,
      -3,
      FinancialStatus.PAGO,
      PaymentMethod.TRANSFERENCIA,
      null,
      null,
    ],
    [
      '00000000-0000-4000-8000-000000000009',
      FinancialEntryType.PAYABLE,
      'Aluguel do galpao',
      'Administrativo',
      4200.0,
      10,
      null,
      FinancialStatus.PENDENTE,
      null,
      null,
      null,
    ],
    [
      '00000000-0000-4000-8000-000000000010',
      FinancialEntryType.PAYABLE,
      'Energia eletrica oficina',
      'Administrativo',
      860.0,
      -4,
      -4,
      FinancialStatus.PAGO,
      PaymentMethod.BOLETO,
      null,
      null,
    ],
    [
      '00000000-0000-4000-8000-000000000011',
      FinancialEntryType.RECEIVABLE,
      'Manutencao preventiva frota Vida Plena',
      'Servicos',
      519.8,
      12,
      null,
      FinancialStatus.PENDENTE,
      null,
      8,
      'OS-DEMO-2026-007',
    ],
  ];

  for (const [
    key,
    type,
    description,
    category,
    amount,
    dueDays,
    paidDays,
    status,
    paymentMethod,
    clientIndex,
    orderNumber,
  ] of financialEntries) {
    await prisma.financialEntry.upsert({
      where: { id: String(key) },
      update: {},
      create: {
        id: String(key),
        type,
        description: String(description),
        category: String(category),
        amount: money(Number(amount)),
        dueDate: daysFromNow(Number(dueDays)),
        paidAt: paidDays === null ? null : daysFromNow(Number(paidDays)),
        status,
        paymentMethod,
        clientId: clientIndex === null ? null : byIndex(clients, clientIndex).id,
        serviceOrderId: orderNumber === null ? null : orderByNumber.get(String(orderNumber))?.id,
        notes: 'Lancamento financeiro de demonstracao.',
      },
    });
  }

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
