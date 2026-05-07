# Documentação do Backend - oficina-backend

## 1. Visão Geral do Projeto

O `oficina-backend` é o backend MVP de um sistema de gestão para oficina mecânica. A API centraliza fluxos operacionais como autenticação, usuários internos, clientes, veículos, orçamentos, ordens de serviço, catálogo de serviços, estoque, financeiro, dashboard e healthcheck.

O projeto foi construído com NestJS, TypeScript, PostgreSQL e Prisma. Ele expõe uma API HTTP versionada, protegida por JWT e controle de acesso por papéis.

### Propósito

O backend resolve a necessidade de organizar digitalmente a operação de uma oficina mecânica, conectando informações que normalmente ficam dispersas:

- cadastro de clientes;
- cadastro e histórico de veículos;
- criação e acompanhamento de orçamentos;
- conversão de orçamentos aprovados em ordens de serviço;
- controle de status da execução;
- consumo de peças do estoque;
- geração de lançamentos financeiros;
- indicadores consolidados para dashboard.

### Objetivo Dentro da Solução

O backend é a camada responsável por:

- persistir os dados do domínio;
- validar regras de negócio;
- autenticar e autorizar usuários;
- expor endpoints REST para o frontend ou outros consumidores;
- coordenar fluxos transacionais, como conversão de orçamento, consumo de estoque e geração de contas a receber.

## 2. Necessidade do Projeto

Oficinas mecânicas precisam acompanhar, de forma integrada, quem é o cliente, qual veículo está em atendimento, quais problemas foram relatados, quais serviços e peças foram orçados, qual o status da ordem de serviço e qual impacto financeiro foi gerado.

Este backend existe para estruturar esse fluxo de ponta a ponta. Ele reduz perda de informação entre atendimento, mecânica, estoque e financeiro.

### Fluxo Principal do Sistema

1. Um usuário autenticado cadastra cliente e veículo.
2. O atendimento cria um orçamento com itens de mão de obra, peças ou ambos.
3. O orçamento pode ser aprovado ou reprovado.
4. Um orçamento aprovado pode ser convertido em ordem de serviço.
5. A ordem de serviço evolui por status: `ABERTA`, `EM_ANDAMENTO`, `FINALIZADA`, `ENTREGUE`.
6. Ao finalizar uma OS, o backend registra histórico do veículo e pode consumir itens de estoque vinculados ao orçamento.
7. Ao entregar uma OS, o backend cria lançamento financeiro a receber quando houver valor a cobrar.
8. Dashboard e financeiro consolidam informações operacionais.

## 3. Escopo Funcional

### Módulos Implementados

- Autenticação e sessão JWT.
- Usuários internos.
- Mecânicos como usuários internos simplificados.
- Clientes.
- Veículos e histórico.
- Orçamentos.
- Conversão de orçamento em ordem de serviço.
- Ordens de serviço.
- Catálogo de serviços.
- Estoque.
- Movimentações de estoque.
- Lançamentos financeiros.
- Dashboard.
- Healthcheck.

### Limites do MVP

O projeto se declara como MVP no `package.json` e no `README.md`. Pelo código atual, o MVP não implementa:

- multi-tenancy;
- refresh token;
- auditoria dedicada;
- rastreamento distribuído;
- permissões por propriedade de recurso;
- healthcheck de banco de dados;
- remoção física de clientes.

## 4. Stack e Tecnologias

- Linguagem: TypeScript.
- Runtime: Node.js `>=22.0.0`.
- Gerenciador: npm `>=10.0.0`.
- Framework: NestJS 11.
- Banco de dados: PostgreSQL.
- ORM: Prisma.
- Autenticação: JWT com Passport.
- Hash de senha: bcrypt.
- Validação: class-validator e class-transformer.
- Documentação API: Swagger/OpenAPI via `@nestjs/swagger`.
- Segurança HTTP: Helmet.
- CORS: configurável por variáveis de ambiente.
- Rate limiting: `@nestjs/throttler`.
- Logs: `nestjs-pino`, `pino`, `pino-http`.
- Testes: Jest e Supertest.
- Containers: Dockerfile e Docker Compose.
- Qualidade: ESLint e Prettier.

## 5. Arquitetura do Backend

O backend segue uma arquitetura modular baseada no NestJS. Cada domínio possui um módulo próprio, geralmente composto por controller, service, DTOs e, quando o fluxo exige mais coordenação, use-cases.

### Organização Geral

- Controllers recebem requisições HTTP, aplicam guards e delegam para services.
- DTOs definem contratos de entrada e validações.
- Services concentram operações de aplicação e persistência.
- Use-cases encapsulam fluxos com regras de negócio mais fortes.
- PrismaService centraliza o acesso ao banco via Prisma Client.
- Guards aplicam autenticação e autorização.
- Filtro global padroniza respostas de erro.

### Decisões Arquiteturais Relevantes

- API com prefixo global configurável por `API_PREFIX`.
- Versionamento por URI com versão padrão `v1`.
- Validação global com `whitelist`, `forbidNonWhitelisted` e transformação.
- RBAC por decorators `@Roles(...)` e `RolesGuard`.
- Transações Prisma em fluxos sensíveis, como atualização de orçamento, conversão em OS, baixa de estoque e pagamento.
- Ordenação protegida por allowlist de campos usando `buildSafeOrderBy`.
- Paginação padronizada com resposta `{ data, meta }`.

## 6. Estrutura de Pastas

```text
src/
  app.module.ts
  main.ts
  auth/
  budget-conversions/
  budgets/
  clients/
  common/
  config/
  dashboard/
  financial/
  health/
  inventory/
  prisma/
  service-catalog/
  service-orders/
  users/
  vehicles/
prisma/
  schema.prisma
  seed.ts
  migrations/
test/
```

### Principais Responsabilidades

- `src/main.ts`: bootstrap da aplicação, prefixo global, versionamento, CORS, Helmet, Swagger, pipes e shutdown hooks do Prisma.
- `src/app.module.ts`: composição dos módulos, logger, rate limiting e filtro global.
- `src/auth`: login, registro protegido, JWT strategy e guard.
- `src/users`: gestão de usuários internos e mecânicos.
- `src/clients`: cadastro, listagem, atualização e inativação de clientes.
- `src/vehicles`: cadastro, listagem, atualização e histórico de veículos.
- `src/budgets`: criação, atualização, aprovação e reprovação de orçamentos.
- `src/budget-conversions`: conversão de orçamento aprovado em OS.
- `src/service-orders`: ordens de serviço, status e peças utilizadas.
- `src/service-catalog`: catálogo de serviços.
- `src/inventory`: estoque, alertas e movimentações.
- `src/financial`: lançamentos financeiros, pagamento e resumo.
- `src/dashboard`: indicadores operacionais.
- `src/health`: healthcheck simples.
- `src/common`: guards, decorators, enums, filtros, DTOs e utilitários compartilhados.
- `src/config`: configuração e validação de ambiente.
- `prisma/schema.prisma`: modelo de dados.
- `prisma/seed.ts`: seed opcional de administrador.

## 7. Domínio de Negócio

### Entidades Principais

- `User`: usuário interno do sistema.
- `Client`: cliente da oficina.
- `Vehicle`: veículo vinculado a um cliente.
- `Budget`: orçamento para um cliente e veículo.
- `BudgetItem`: item de orçamento, podendo representar peça, mão de obra ou ambos.
- `ServiceOrder`: ordem de serviço.
- `ServiceOrderPart`: peça efetivamente usada em uma OS.
- `InventoryItem`: item de estoque.
- `InventoryMovement`: movimentação de estoque.
- `FinancialEntry`: lançamento financeiro a pagar ou receber.
- `VehicleHistory`: histórico de atendimento do veículo.
- `ServiceCatalogItem`: serviço catalogado com precificação e regras.

### Regras Importantes

- Um veículo deve pertencer ao cliente informado em orçamentos e ordens de serviço.
- Orçamentos só podem ser atualizados enquanto estão `PENDENTE`.
- Orçamentos só podem ser aprovados ou reprovados se estiverem `PENDENTE`.
- Apenas orçamentos `APROVADO` podem ser convertidos em OS.
- Um orçamento não pode ser convertido mais de uma vez.
- A OS segue transições controladas de status.
- A entrega (`ENTREGUE`) só pode ocorrer após finalização (`FINALIZADA`).
- Peças adicionadas em OS consomem estoque.
- O sistema bloqueia consumo quando o estoque é insuficiente.
- Ao finalizar OS, o histórico do veículo é criado ou atualizado.
- Ao entregar OS, o backend cria uma conta a receber quando houver valor positivo e ainda não existir uma.
- Clientes são inativados via soft delete (`isActive=false`).

## 8. Banco de Dados

O banco é modelado em Prisma usando PostgreSQL.

### Enums

- `Role`: `ADMIN`, `ATENDENTE`, `MECANICO`, `FINANCEIRO`.
- `BudgetStatus`: `PENDENTE`, `APROVADO`, `REPROVADO`.
- `BudgetItemType`: `PART`, `LABOR`, `LABOR_AND_PART`.
- `ServiceOrderStatus`: `ABERTA`, `EM_ANDAMENTO`, `FINALIZADA`, `ENTREGUE`.
- `FinancialEntryType`: `RECEIVABLE`, `PAYABLE`.
- `FinancialStatus`: `PENDENTE`, `PAGO`, `VENCIDO`.
- `PaymentMethod`: `DINHEIRO`, `PIX`, `CARTAO_CREDITO`, `CARTAO_DEBITO`, `BOLETO`, `TRANSFERENCIA`, `OUTRO`.
- `ServiceBillingType`: `LABOR_ONLY`, `PARTS_AND_LABOR`, `FIXED_PRICE`.
- `ServiceMaterialSource`: `SHOP_SUPPLIES`, `CUSTOMER_SUPPLIES`, `NO_PARTS_REQUIRED`, `FLEXIBLE`.
- `InventoryMovementType`: `OUT`, `ADJUSTMENT`.

### Restrições e Relacionamentos Relevantes

- `User.email` é único.
- `Client.document` é único quando informado.
- `Vehicle.plate` é único.
- `Vehicle` possui unique composto `[id, clientId]`.
- `Budget.code` é único.
- `Budget.vehicle` referencia o par `[vehicleId, clientId]`, garantindo coerência cliente-veículo.
- `ServiceOrder.orderNumber` é único.
- `ServiceOrder.budgetId` é único e opcional.
- `ServiceOrder.vehicle` também referencia `[vehicleId, clientId]`.
- `ServiceOrderPart` possui unique composto `[serviceOrderId, inventoryItemId]`.
- `InventoryItem.internalCode` é único.
- `ServiceCatalogItem.code` é único.
- `VehicleHistory.serviceOrderId` é único quando vinculado.

### Migrations

Existem migrations em `prisma/migrations`, incluindo:

- inicialização do schema;
- remoção de campo de chassi de veículo;
- criação de catálogo de serviços;
- remoção de tempo estimado do catálogo;
- vínculo entre itens de orçamento e catálogo;
- renumeração sequencial de ordens de serviço;
- vínculos financeiros e de estoque;
- adição de movimentações de inventário.

### Seed

O seed (`prisma/seed.ts`) cria um usuário administrador somente se as variáveis abaixo estiverem definidas:

- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_PASSWORD`
- `SEED_ADMIN_NAME`

Se o e-mail já existir, o usuário não é recriado.

## 9. Autenticação e Autorização

### Login

`POST /api/v1/auth/login` valida e-mail e senha, atualiza `lastLoginAt` e retorna um access token JWT.

```json
{
  "email": "admin@example.com",
  "password": "Admin123"
}
```

Resposta:

```json
{
  "accessToken": "jwt.token",
  "user": {
    "id": "uuid",
    "name": "Admin",
    "email": "admin@example.com",
    "role": "ADMIN"
  }
}
```

### JWT

O token contém:

- `sub`: id do usuário;
- `email`: e-mail;
- `role`: papel de acesso.

A `JwtStrategy` valida:

- assinatura com `JWT_SECRET`;
- expiração;
- issuer;
- audience;
- existência do usuário;
- usuário ativo;
- compatibilidade entre `payload.sub` e usuário encontrado por e-mail.

### Autorização

A autorização usa:

- `JwtAuthGuard` para exigir Bearer token;
- `RolesGuard` para verificar roles exigidas via `@Roles(...)`.

Mensagem de acesso negado:

```json
{
  "statusCode": 403,
  "message": "Você não tem permissão para acessar este recurso",
  "path": "/api/v1/recurso",
  "timestamp": "2026-05-06T12:00:00.000Z"
}
```

## 10. Endpoints / API

As rotas usam prefixo global e versionamento. Com `.env.example`, a base é:

```text
http://localhost:3000/api/v1
```

O healthcheck é registrado como `@Controller('health')`. Como o versionamento global por URI está habilitado com versão padrão `1`, a rota esperada no padrão do projeto é `GET /api/v1/health`.

### Auth

#### `POST /auth/login`

- Autenticação: não exige JWT.
- Rate limit específico: 5 requisições por 60 segundos.
- Body:

```json
{
  "email": "admin@example.com",
  "password": "Admin123"
}
```

- Erros: `400` payload inválido, `401` credenciais inválidas, `429` rate limit.

#### `POST /auth/register`

- Autenticação: JWT.
- Roles: `ADMIN`.
- Cria usuário e retorna token para o usuário criado.

```json
{
  "name": "Atendente",
  "email": "atendente@example.com",
  "password": "Atendente123",
  "role": "ATENDENTE",
  "isActive": true
}
```

#### `GET /auth/me`

- Autenticação: JWT.
- Retorna usuário autenticado sem `passwordHash`.

### Users

Todas as rotas exigem JWT e role `ADMIN`.

| Método  | Rota         | Descrição            |
| ------- | ------------ | -------------------- |
| `POST`  | `/users`     | Cria usuário interno |
| `GET`   | `/users`     | Lista usuários       |
| `GET`   | `/users/:id` | Obtém usuário por id |
| `PATCH` | `/users/:id` | Atualiza usuário     |

Query de listagem: `page`, `limit`, `search`, `sortBy`, `sortOrder`, `role`, `active`.

Campos ordenáveis: `name`, `email`, `role`, `createdAt`, `updatedAt`, `lastLoginAt`.

Body de criação:

```json
{
  "name": "Financeiro",
  "email": "financeiro@example.com",
  "password": "Financeiro123",
  "role": "FINANCEIRO",
  "isActive": true
}
```

Erros relevantes: `409 Usuário já existe`, `404 Usuário não encontrado`.

### Mechanics

Todas as rotas exigem JWT e role `ADMIN`.

| Método  | Rota             | Descrição             |
| ------- | ---------------- | --------------------- |
| `POST`  | `/mechanics`     | Cria mecânico interno |
| `GET`   | `/mechanics`     | Lista mecânicos       |
| `GET`   | `/mechanics/:id` | Obtém mecânico        |
| `PATCH` | `/mechanics/:id` | Atualiza mecânico     |

Body:

```json
{
  "name": "João Mecânico",
  "isActive": true
}
```

Observação: o backend gera e-mail interno no formato aproximado `nome.timestamp@internal.local` e uma senha interna aleatória, mas a resposta sanitizada não retorna a senha gerada.

### Clients

Exige JWT e `ADMIN` ou `ATENDENTE`.

| Método   | Rota           | Descrição                  |
| -------- | -------------- | -------------------------- |
| `POST`   | `/clients`     | Cria cliente               |
| `GET`    | `/clients`     | Lista clientes             |
| `GET`    | `/clients/:id` | Obtém cliente com veículos |
| `PATCH`  | `/clients/:id` | Atualiza cliente           |
| `DELETE` | `/clients/:id` | Inativa cliente            |

Body:

```json
{
  "name": "Maria Silva",
  "document": "12345678900",
  "phone": "11999999999",
  "email": "maria@example.com",
  "notes": "Cliente recorrente"
}
```

Listagem suporta `page`, `limit`, `search`, `sortBy`, `sortOrder`.

Campos ordenáveis: `name`, `createdAt`, `updatedAt`.

Erros relevantes: documento duplicado, cliente não encontrado.

### Vehicles

| Método                      | Rota                 | Roles                            |
| --------------------------- | -------------------- | -------------------------------- |
| `POST /vehicles`            | Cria veículo         | `ADMIN`, `ATENDENTE`             |
| `GET /vehicles`             | Lista veículos       | `ADMIN`, `ATENDENTE`             |
| `GET /vehicles/:id`         | Obtém veículo        | `ADMIN`, `ATENDENTE`, `MECANICO` |
| `PATCH /vehicles/:id`       | Atualiza veículo     | `ADMIN`, `ATENDENTE`             |
| `GET /vehicles/:id/history` | Histórico do veículo | `ADMIN`, `ATENDENTE`, `MECANICO` |

Body:

```json
{
  "clientId": "uuid",
  "plate": "ABC1234",
  "brand": "Toyota",
  "model": "Corolla",
  "year": 2020,
  "color": "Prata",
  "mileage": 50000,
  "fuel": "Flex",
  "notes": "Revisão preventiva"
}
```

Regras:

- placa é armazenada em uppercase;
- placa deve ser única;
- cliente informado deve existir e estar ativo.

### Budgets

| Método                                       | Rota               | Roles                              |
| -------------------------------------------- | ------------------ | ---------------------------------- |
| `POST /budgets`                              | Cria orçamento     | `ADMIN`, `ATENDENTE`               |
| `GET /budgets`                               | Lista orçamentos   | `ADMIN`, `ATENDENTE`, `FINANCEIRO` |
| `GET /budgets/:id`                           | Obtém orçamento    | `ADMIN`, `ATENDENTE`, `FINANCEIRO` |
| `PATCH /budgets/:id`                         | Atualiza orçamento | `ADMIN`, `ATENDENTE`               |
| `PATCH /budgets/:id/approve`                 | Aprova orçamento   | `ADMIN`, `ATENDENTE`               |
| `PATCH /budgets/:id/reject`                  | Reprova orçamento  | `ADMIN`, `ATENDENTE`               |
| `POST /budgets/:id/convert-to-service-order` | Converte em OS     | `ADMIN`, `ATENDENTE`               |

Body de criação:

```json
{
  "clientId": "uuid",
  "vehicleId": "uuid",
  "problemDescription": "Barulho ao frear",
  "notes": "Cliente solicitou urgência",
  "discount": 50,
  "items": [
    {
      "type": "LABOR",
      "description": "Diagnóstico e troca de pastilhas",
      "serviceCatalogItemId": "uuid",
      "quantity": 1,
      "unitPrice": 250
    },
    {
      "type": "PART",
      "description": "Pastilha de freio",
      "inventoryItemId": "uuid",
      "quantity": 1,
      "unitPrice": 180
    }
  ]
}
```

Regras:

- `items` deve ter pelo menos um item.
- `discount` não pode ser maior que o subtotal.
- `vehicleId` deve pertencer ao `clientId`.
- itens `LABOR` e `LABOR_AND_PART` podem referenciar serviço ativo do catálogo.
- itens `PART` e `LABOR_AND_PART` exigem item de estoque válido quando usam peça.
- código do orçamento é gerado como `BUD-${Date.now()}`.
- atualização só é permitida quando o orçamento está `PENDENTE`.
- aprovação e reprovação só são permitidas quando está `PENDENTE`.
- conversão só é permitida quando está `APROVADO`.

Resposta de conversão:

```json
{
  "id": "budget-uuid",
  "convertedToServiceOrder": true,
  "serviceOrder": {
    "id": "service-order-uuid",
    "orderNumber": "OS000001",
    "status": "ABERTA"
  }
}
```

### Service Orders

| Método                             | Rota               | Roles                                          |
| ---------------------------------- | ------------------ | ---------------------------------------------- |
| `POST /service-orders`             | Cria OS            | `ADMIN`, `ATENDENTE`                           |
| `GET /service-orders`              | Lista OS           | `ADMIN`, `ATENDENTE`, `MECANICO`, `FINANCEIRO` |
| `GET /service-orders/:id`          | Obtém OS detalhada | `ADMIN`, `ATENDENTE`, `MECANICO`, `FINANCEIRO` |
| `PATCH /service-orders/:id`        | Atualiza OS        | `ADMIN`, `ATENDENTE`, `MECANICO`               |
| `PATCH /service-orders/:id/status` | Atualiza status    | `ADMIN`, `ATENDENTE`, `MECANICO`               |
| `POST /service-orders/:id/parts`   | Adiciona peça      | `ADMIN`, `ATENDENTE`, `MECANICO`               |
| `GET /service-orders/:id/parts`    | Lista peças da OS  | `ADMIN`, `ATENDENTE`, `MECANICO`, `FINANCEIRO` |

Body de criação:

```json
{
  "clientId": "uuid",
  "vehicleId": "uuid",
  "mechanicId": "uuid",
  "problemDescription": "Motor falhando",
  "diagnosis": "Falha em velas",
  "servicesPerformed": "Aguardando execução",
  "vehicleChecklist": "Sem avarias aparentes",
  "expectedDeliveryAt": "2026-05-10",
  "notes": "Cliente pediu contato antes da troca"
}
```

Atualização de status:

```json
{
  "status": "FINALIZADA"
}
```

Transições permitidas:

- `ABERTA` -> `ABERTA`, `EM_ANDAMENTO`, `FINALIZADA`
- `EM_ANDAMENTO` -> `EM_ANDAMENTO`, `FINALIZADA`
- `FINALIZADA` -> `FINALIZADA`, `ENTREGUE`
- `ENTREGUE` -> `ENTREGUE`

Adição de peça:

```json
{
  "inventoryItemId": "uuid",
  "quantity": 2,
  "unitPrice": 85.5
}
```

Regras:

- OS recebe número sequencial `OS000001`, `OS000002`, etc.
- `expectedDeliveryAt` deve ser uma data válida, com ano de 4 dígitos, e não pode ser anterior ao dia atual.
- ao adicionar peça, o estoque é decrementado;
- se a peça já existir na OS, a quantidade é acumulada;
- ao finalizar OS com orçamento, itens de estoque do orçamento são consumidos se ainda não estiverem em `ServiceOrderPart`;
- ao finalizar OS, histórico do veículo é registrado;
- ao entregar OS, uma conta a receber é criada quando houver valor positivo.

Observação: ao validar `mechanicId`, o código verifica se o usuário existe, mas não confirma explicitamente que a role é `MECANICO`.

### Services / Service Catalog

Base: `/services`.

| Método                           | Rota                     | Roles                                          |
| -------------------------------- | ------------------------ | ---------------------------------------------- |
| `POST /services`                 | Cria serviço do catálogo | `ADMIN`, `ATENDENTE`                           |
| `GET /services`                  | Lista serviços           | `ADMIN`, `ATENDENTE`, `MECANICO`, `FINANCEIRO` |
| `GET /services/:id`              | Obtém serviço            | `ADMIN`, `ATENDENTE`, `MECANICO`, `FINANCEIRO` |
| `PATCH /services/:id`            | Atualiza serviço         | `ADMIN`, `ATENDENTE`                           |
| `PATCH /services/:id/activate`   | Ativa serviço            | `ADMIN`, `ATENDENTE`                           |
| `PATCH /services/:id/deactivate` | Inativa serviço          | `ADMIN`, `ATENDENTE`                           |

Body:

```json
{
  "code": "SRV-FREIO",
  "name": "Troca de pastilhas",
  "category": "Freios",
  "description": "Serviço de substituição de pastilhas",
  "internalNotes": "Validar disco",
  "laborPrice": 200,
  "productPrice": 180,
  "billingType": "PARTS_AND_LABOR",
  "materialSource": "SHOP_SUPPLIES",
  "warrantyDays": 90,
  "active": true
}
```

Regras:

- se `code` for omitido, gera `SRV-000001`, `SRV-000002`, etc.;
- `code` é normalizado para uppercase;
- `name`, `category`, `description` e `internalNotes` são aparados;
- `suggestedTotalPrice = laborPrice + productPrice`;
- `code` deve ser único;
- `name` deve ser único dentro da categoria, de forma case-insensitive;
- `LABOR_ONLY` exige `productPrice = 0`;
- `LABOR_ONLY` não pode usar `materialSource=SHOP_SUPPLIES`;
- `NO_PARTS_REQUIRED` exige `productPrice = 0`;
- `PARTS_AND_LABOR` não pode usar `NO_PARTS_REQUIRED`.

### Inventory

| Método                            | Rota                          | Roles                              |
| --------------------------------- | ----------------------------- | ---------------------------------- |
| `POST /inventory`                 | Cria item de estoque          | `ADMIN`, `ATENDENTE`               |
| `GET /inventory`                  | Lista itens                   | `ADMIN`, `ATENDENTE`, `FINANCEIRO` |
| `GET /inventory/alerts/low-stock` | Alertas de baixo estoque      | `ADMIN`, `ATENDENTE`               |
| `GET /inventory/:id/movements`    | Últimas movimentações do item | `ADMIN`, `ATENDENTE`, `FINANCEIRO` |
| `GET /inventory/:id`              | Obtém item                    | `ADMIN`, `ATENDENTE`, `FINANCEIRO` |
| `PATCH /inventory/:id`            | Atualiza item                 | `ADMIN`, `ATENDENTE`               |

Body:

```json
{
  "name": "Filtro de óleo",
  "internalCode": "P-FILTRO-001",
  "category": "Filtros",
  "supplier": "Fornecedor X",
  "quantity": 20,
  "minimumQuantity": 5,
  "cost": 25,
  "salePrice": 45
}
```

Regras:

- se `internalCode` for omitido, gera `P-000001`, `P-000002`, etc.;
- código interno deve ser único;
- alteração manual de quantidade gera movimentação `ADJUSTMENT`;
- consumo em OS gera movimentação `OUT`;
- estoque baixo é calculado quando `quantity <= minimumQuantity * 1.5`;
- endpoint de movimentações retorna até 8 registros mais recentes.

### Financial

| Método                     | Rota                | Roles                 |
| -------------------------- | ------------------- | --------------------- |
| `POST /financial`          | Cria lançamento     | `ADMIN`, `FINANCEIRO` |
| `GET /financial`           | Lista lançamentos   | `ADMIN`, `FINANCEIRO` |
| `GET /financial/summary`   | Resumo financeiro   | `ADMIN`, `FINANCEIRO` |
| `GET /financial/:id`       | Obtém lançamento    | `ADMIN`, `FINANCEIRO` |
| `PATCH /financial/:id`     | Atualiza lançamento | `ADMIN`, `FINANCEIRO` |
| `PATCH /financial/:id/pay` | Marca como pago     | `ADMIN`, `FINANCEIRO` |

Body de criação:

```json
{
  "type": "RECEIVABLE",
  "description": "Pagamento OS000001",
  "category": "Ordem de Serviço",
  "amount": 430,
  "dueDate": "2026-05-10",
  "paymentMethod": "PIX",
  "clientId": "uuid",
  "serviceOrderId": "uuid",
  "notes": "Pagamento previsto"
}
```

Pagamento:

```json
{
  "paymentMethod": "PIX",
  "paidAt": "2026-05-10T14:00:00.000Z"
}
```

Regras:

- se `dueDate` for anterior ao momento atual, status inicial é `VENCIDO`; caso contrário, `PENDENTE`;
- listagem e consulta sincronizam lançamentos pendentes vencidos;
- lançamentos `PAGO` não podem ser atualizados;
- lançamento já pago não pode ser pago novamente;
- se `clientId` e `serviceOrderId` forem informados, o cliente deve ser o mesmo da OS.

Resumo financeiro retorna:

```json
{
  "receivablesValue": "1000",
  "stockOutValue": "300"
}
```

### Dashboard

#### `GET /dashboard/summary`

- Roles: `ADMIN`, `ATENDENTE`, `FINANCEIRO`.
- Retorna indicadores de OS, orçamentos, financeiro e estoque.

Exemplo de resposta:

```json
{
  "serviceOrders": {
    "open": 3,
    "inProgress": 2,
    "readyForDelivery": 1
  },
  "budgets": {
    "pending": 4
  },
  "financial": {
    "monthRevenue": "1500",
    "stockOutValue": "350"
  },
  "inventory": {
    "lowStockCount": 2,
    "lowStockItems": [
      {
        "id": "uuid",
        "name": "Filtro de óleo",
        "quantity": 4,
        "minimumQuantity": 5,
        "internalCode": "P-000001"
      }
    ]
  }
}
```

### Health

#### `GET /health`

- Autenticação: não exige JWT.
- Retorna status simples da aplicação.

```json
{
  "status": "ok",
  "timestamp": "2026-05-06T12:00:00.000Z"
}
```

Observação: não há verificação explícita de conectividade com banco nesse endpoint.

## 11. Regras de Validação

O `ValidationPipe` global está configurado com:

- `whitelist: true`;
- `forbidNonWhitelisted: true`;
- `transform: true`;
- `enableImplicitConversion: true`;
- mensagens formatadas por `formatValidationMessages`.

Isso significa que:

- campos não declarados em DTOs são rejeitados;
- query params numéricos podem ser convertidos;
- payloads inválidos retornam `400 Bad Request`;
- detalhes de `target` e `value` não são expostos.

### Validações Relevantes

- Senhas de usuário: mínimo de 8 caracteres e regex exigindo minúscula, maiúscula e número.
- Login: e-mail válido e senha com mínimo de 8 caracteres.
- UUIDs: IDs em body e params usam validação de UUID.
- Paginação: `page >= 1`, `limit` entre 1 e 100.
- Ordenação: `sortOrder` aceita apenas `asc` ou `desc`.
- Valores monetários: máximo de 2 casas decimais e mínimo zero quando aplicável.
- Quantidades: inteiros ou números positivos conforme DTO.
- Datas: `IsDateString` para campos de data enviados como string.
- `expectedDeliveryAt`: validação adicional de data real, ano com 4 dígitos e não anterior ao dia atual.

## 12. Tratamento de Erros

O filtro global `HttpExceptionFilter` captura exceções e responde no formato:

```json
{
  "statusCode": 400,
  "message": "Mensagem do erro",
  "path": "/api/v1/recurso",
  "timestamp": "2026-05-06T12:00:00.000Z"
}
```

Para erros `5xx`, o filtro registra log com:

- exceção;
- método HTTP;
- URL.

### Códigos Mais Comuns

- `400 Bad Request`: validação, regra de negócio ou transição inválida.
- `401 Unauthorized`: token ausente/inválido ou credenciais inválidas.
- `403 Forbidden`: role sem permissão.
- `404 Not Found`: recurso inexistente.
- `409 Conflict`: duplicidade ou conflito de estado.
- `429 Too Many Requests`: limite de requisições excedido.
- `500 Internal Server Error`: falha inesperada.

## 13. Segurança

### Práticas Implementadas

- JWT Bearer para endpoints protegidos.
- RBAC por roles.
- bcrypt para hash de senha.
- Helmet habilitado globalmente.
- CORS configurável.
- Bloqueio de `CORS_ORIGIN=*` na validação de ambiente.
- Rate limiting global via `ThrottlerGuard`.
- Throttle mais restritivo em login.
- `ValidationPipe` com rejeição de campos extras.
- Redaction de dados sensíveis em logs.
- Validação de `JWT_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE` e Swagger em produção.
- Usuários retornados sem `passwordHash`.

### Pontos de Atenção

- Não há refresh token.
- Não há auditoria dedicada.
- Não há MFA.
- Não há policies por propriedade de recurso.
- Não há confirmação explícita de role `MECANICO` ao associar `mechanicId` em OS.

## 14. Logs, Observabilidade e Monitoramento

O projeto usa `nestjs-pino` com `pino-http`.

Dados sensíveis mascarados:

- `req.headers.authorization`;
- `req.body.password`;
- `res.headers["set-cookie"]`.

O nível de log vem de `LOG_LEVEL`.

Existe healthcheck simples em `/health`, mas não há:

- endpoint de readiness/liveness separado;
- verificação de banco no healthcheck;
- métricas Prometheus;
- tracing distribuído;
- correlação explícita por request id no código analisado.

## 15. Configuração do Ambiente

Variáveis reais do projeto:

| Variável              | Obrigatória | Descrição                                 |
| --------------------- | ----------- | ----------------------------------------- |
| `NODE_ENV`            | Sim         | `development`, `test` ou `production`     |
| `PORT`                | Sim         | Porta HTTP                                |
| `APP_NAME`            | Sim         | Nome da aplicação                         |
| `APP_VERSION`         | Sim         | Versão da aplicação                       |
| `API_PREFIX`          | Sim         | Prefixo global da API                     |
| `DATABASE_URL`        | Sim         | URL PostgreSQL usada pelo Prisma          |
| `JWT_SECRET`          | Sim         | Segredo de assinatura JWT                 |
| `JWT_EXPIRES_IN`      | Sim         | Expiração do token                        |
| `JWT_ISSUER`          | Produção    | Emissor esperado no JWT                   |
| `JWT_AUDIENCE`        | Produção    | Audiência esperada no JWT                 |
| `BCRYPT_SALT_ROUNDS`  | Sim         | Custo bcrypt, entre 10 e 15               |
| `CORS_ORIGIN`         | Sim         | Origens permitidas, separadas por vírgula |
| `CORS_CREDENTIALS`    | Não         | Habilita credenciais CORS                 |
| `THROTTLE_TTL`        | Sim         | Janela de rate limit em segundos          |
| `THROTTLE_LIMIT`      | Sim         | Limite de requisições por janela          |
| `LOG_LEVEL`           | Sim         | Nível de log                              |
| `ENABLE_SWAGGER`      | Não         | Habilita Swagger fora de produção         |
| `SEED_ADMIN_EMAIL`    | Não         | e-mail do admin criado no seed            |
| `SEED_ADMIN_PASSWORD` | Não         | Senha do admin criado no seed             |
| `SEED_ADMIN_NAME`     | Não         | Nome do admin criado no seed              |

Em produção, a validação bloqueia:

- `JWT_SECRET` com menos de 32 caracteres;
- secrets fracos como `secret`, `changeme`, `change-me`, `jwt-secret`;
- ausência de `JWT_ISSUER`;
- ausência de `JWT_AUDIENCE`;
- `ENABLE_SWAGGER=true`;
- wildcard em `CORS_ORIGIN`.

## 16. Como Rodar o Projeto

### Pré-requisitos

- Node.js `>=22.0.0`.
- npm `>=10.0.0`.
- PostgreSQL disponível.
- Docker e Docker Compose, se usar banco em container.

### Instalação

```bash
npm install
```

### Banco com Docker Compose

```bash
docker compose up -d postgres
```

O `docker-compose.yml` define:

- PostgreSQL 16 Alpine;
- banco `oficina_db`;
- usuário `postgres`;
- senha `postgres`;
- volume `postgres_data`.

### Configuração Local

```bash
cp .env.example .env
```

Depois ajuste os valores sensíveis.

### Prisma

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

### Desenvolvimento

```bash
npm run start:dev
```

API local padrão:

```text
http://localhost:3000/api/v1
```

Swagger, quando habilitado e fora de produção:

```text
http://localhost:3000/docs
```

### Produção

```bash
npm run build
npm run prisma:migrate:deploy
npm run start
```

### Docker

```bash
docker compose up -d --build
```

O serviço `api` executa:

```bash
npm run prisma:generate && npm run prisma:migrate:deploy && npm run start
```

### Scripts

| Script                          | Descrição                     |
| ------------------------------- | ----------------------------- |
| `npm run build`                 | Compila NestJS para `dist/`   |
| `npm run start`                 | Executa `node dist/main.js`   |
| `npm run start:dev`             | Executa em watch              |
| `npm run start:debug`           | Executa com debug             |
| `npm run lint`                  | Roda ESLint                   |
| `npm run format`                | Roda Prettier                 |
| `npm run test`                  | Testes unitários              |
| `npm run test:watch`            | Testes em watch               |
| `npm run test:cov`              | Testes com cobertura          |
| `npm run test:e2e`              | Testes end-to-end             |
| `npm run prisma:generate`       | Gera Prisma Client            |
| `npm run prisma:migrate`        | Migrations em desenvolvimento |
| `npm run prisma:migrate:deploy` | Aplica migrations existentes  |
| `npm run prisma:seed`           | Executa seed                  |

## 17. Testes

O projeto possui testes unitários em vários módulos:

- autenticação JWT;
- validação de ambiente;
- validação de input;
- utilitários de data, ordenação e paginação;
- catálogo de serviços;
- orçamentos;
- conversão de orçamentos;
- ordens de serviço;
- estoque;
- financeiro;
- dashboard.

Também existe configuração e teste e2e em `test/`.

### Execução

```bash
npm run test
npm run test:cov
npm run test:e2e
```

### Observações

O código possui cobertura direcionada para regras importantes, mas a documentação não deve assumir cobertura completa de todos os endpoints. Para validar cobertura real, use `npm run test:cov`.

## 18. Boas Práticas e Padrões do Projeto

- Módulos por domínio.
- DTOs com validação explícita.
- Sanitização de usuário removendo `passwordHash`.
- Guards de autenticação e autorização separados.
- Use-cases para fluxos de negócio mais complexos.
- Transações Prisma para operações que alteram múltiplas entidades.
- Ordenação com allowlist para evitar campos arbitrários.
- Paginação padronizada.
- Redaction de credenciais em logs.
- Validação forte de variáveis de ambiente.
- Swagger desabilitado em produção por validação.

## 19. Limitações Atuais e Melhorias Futuras

Pontos observados no código atual:

- Implementar refresh token e estratégia de renovação segura.
- Validar explicitamente que `mechanicId` pertence a um usuário com role `MECANICO`.
- Criar healthcheck de banco de dados.
- Adicionar auditoria de ações sensíveis.
- Evoluir observabilidade com métricas e tracing.
- Avaliar request id/correlation id em logs.
- Criar políticas por propriedade de recurso, se houver necessidade de isolamento por usuário ou unidade.
- Revisar fluxo de criação de mecânico, pois a senha interna gerada não é exposta nem há fluxo visível de primeiro acesso no backend.
- Considerar endpoints específicos para ajustes de estoque, em vez de depender apenas de `PATCH /inventory/:id`.
- Documentar contratos OpenAPI com exemplos mais completos diretamente nos decorators Swagger, se desejado.

## 20. Glossário

- **OS**: ordem de serviço.
- **Orçamento**: proposta de serviços/peças para um cliente e veículo.
- **Item de orçamento**: linha do orçamento, classificada como peça, mão de obra ou ambos.
- **Catálogo de serviços**: base de serviços reutilizáveis com regras de preço e material.
- **Estoque baixo**: item cuja quantidade está abaixo ou igual a `minimumQuantity * 1.5`.
- **Lançamento financeiro**: conta a pagar ou receber.
- **Receivable**: valor a receber.
- **Payable**: valor a pagar.
- **RBAC**: controle de acesso baseado em papéis.
- **JWT**: token assinado usado para autenticar requisições.
- **Soft delete**: inativação lógica sem remover registro fisicamente.
