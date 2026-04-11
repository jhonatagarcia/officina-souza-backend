# Oficina Backend MVP

Backend MVP para gestão de oficina mecânica com NestJS, PostgreSQL, Prisma, JWT e Docker.

## Arquitetura

- `auth` e `users`: autenticação JWT, hash com bcrypt, roles e guards por perfil.
- `clients`, `vehicles`, `budgets`, `service-orders`, `inventory`, `financial`: módulos de domínio isolados, com controllers enxutos e regras de negócio concentradas em services.
- `dashboard`: endpoint agregador para indicadores do MVP.
- `common` e `config`: filtros globais, paginação, decorators, validação de ambiente e utilitários compartilhados.
- `prisma`: acesso a dados centralizado com PrismaService.

## Modelagem

Entidades principais:

- `User`
- `Client`
- `Vehicle`
- `Budget`
- `BudgetItem`
- `ServiceOrder`
- `ServiceOrderPart`
- `InventoryItem`
- `FinancialEntry`
- `VehicleHistory`

Regras principais implementadas:

- CPF/CNPJ único quando informado.
- Placa única por veículo.
- Veículo sempre vinculado ao cliente correto também no banco, via FK composta.
- Orçamento com ao menos um item.
- Conversão para OS apenas com orçamento aprovado.
- Bloqueio de reconversão duplicada.
- Baixa de estoque com transação e decremento atômico.
- Bloqueio de estoque negativo.
- Peça única por item dentro da OS, com consolidação por chave composta.
- Bloqueio de entrega antes de finalização.
- Histórico do veículo alimentado de forma idempotente quando a OS é finalizada.
- Entrega da OS gera lançamento financeiro a receber automaticamente quando existir orçamento vinculado com total positivo.
- Checks de banco para valores monetários, quantidades e coerência de datas/status.

## Estrutura de Pastas

```text
src/
  auth/
  budgets/
  clients/
  common/
  config/
  dashboard/
  financial/
  health/
  inventory/
  prisma/
  service-orders/
  users/
  vehicles/
test/
prisma/
```

## Setup Local

1. Copie `.env.example` para `.env`.
2. Suba o banco:

```bash
docker compose up -d postgres
```

3. Instale dependências:

```bash
npm install
```

4. Gere o client Prisma e rode migrations:

```bash
npm run prisma:generate
npm run prisma:migrate
```

5. Rode o seed opcional de admin:

```bash
npm run prisma:seed
```

6. Inicie a API:

```bash
npm run start:dev
```

Swagger: `http://localhost:3000/docs`

Healthcheck: `GET /api/v1/health`

## Scripts

- `npm run start:dev`
- `npm run build`
- `npm run lint`
- `npm run format`
- `npm run test`
- `npm run test:e2e`
- `npm run prisma:generate`
- `npm run prisma:migrate`
- `npm run prisma:seed`

## Segurança

- JWT com expiração por env.
- bcrypt com salt configurável.
- `ValidationPipe` global com `whitelist` e `forbidNonWhitelisted`.
- `Helmet`, CORS restritivo e `@nestjs/throttler`.
- roles com `JwtAuthGuard` + `RolesGuard`.
- logs com redaction de credenciais e `Authorization`.
- mensagens de erro seguras sem stack trace exposta.
- transações Prisma em fluxos críticos de orçamento/OS/estoque.

## Observações

- O schema Prisma está preparado para PostgreSQL.
- O projeto usa prefixo `api` e versionamento por URI. As rotas seguem `/api/v1/...`.
- O seed cria um admin apenas se as variáveis `SEED_ADMIN_*` estiverem preenchidas.
