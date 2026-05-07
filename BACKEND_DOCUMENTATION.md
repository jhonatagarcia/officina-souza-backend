# Backend Documentation - oficina-backend

## 1. Visao Geral Do Projeto

O `oficina-backend` e o backend MVP de um sistema de gestao para oficina mecanica. A API centraliza fluxos operacionais como autenticacao, usuarios internos, clientes, veiculos, orcamentos, ordens de servico, catalogo de servicos, estoque, financeiro, dashboard e healthcheck.

O projeto foi construido com NestJS, TypeScript, PostgreSQL e Prisma. Ele expoe uma API HTTP versionada, protegida por JWT e controle de acesso por papeis.

### Proposito

O backend resolve a necessidade de organizar digitalmente a operacao de uma oficina mecanica, conectando informacoes que normalmente ficam dispersas:

- cadastro de clientes;
- cadastro e historico de veiculos;
- criacao e acompanhamento de orcamentos;
- conversao de orcamentos aprovados em ordens de servico;
- controle de status da execucao;
- consumo de pecas do estoque;
- geracao de lancamentos financeiros;
- indicadores consolidados para dashboard.

### Objetivo Dentro Da Solucao

O backend e a camada responsavel por:

- persistir os dados do dominio;
- validar regras de negocio;
- autenticar e autorizar usuarios;
- expor endpoints REST para o frontend ou outros consumidores;
- coordenar fluxos transacionais, como conversao de orcamento, consumo de estoque e geracao de contas a receber.

## 2. Necessidade Do Projeto

Oficinas mecanicas precisam acompanhar, de forma integrada, quem e o cliente, qual veiculo esta em atendimento, quais problemas foram relatados, quais servicos e pecas foram orcados, qual o status da ordem de servico e qual impacto financeiro foi gerado.

Este backend existe para estruturar esse fluxo de ponta a ponta. Ele reduz perda de informacao entre atendimento, mecanica, estoque e financeiro.

### Fluxo Principal Do Sistema

1. Um usuario autenticado cadastra cliente e veiculo.
2. O atendimento cria um orcamento com itens de mao de obra, pecas ou ambos.
3. O orcamento pode ser aprovado ou reprovado.
4. Um orcamento aprovado pode ser convertido em ordem de servico.
5. A ordem de servico evolui por status: `ABERTA`, `EM_ANDAMENTO`, `FINALIZADA`, `ENTREGUE`.
6. Ao finalizar uma OS, o backend registra historico do veiculo e pode consumir itens de estoque vinculados ao orcamento.
7. Ao entregar uma OS, o backend cria lancamento financeiro a receber quando houver valor a cobrar.
8. Dashboard e financeiro consolidam informacoes operacionais.

## 3. Escopo Funcional

### Modulos Implementados

- Autenticacao e sessao JWT.
- Usuarios internos.
- Mecanicos como usuarios internos simplificados.
- Clientes.
- Veiculos e historico.
- Orcamentos.
- Conversao de orcamento em ordem de servico.
- Ordens de servico.
- Catalogo de servicos.
- Estoque.
- Movimentacoes de estoque.
- Lancamentos financeiros.
- Dashboard.
- Healthcheck.

### Limites Do MVP

O projeto se declara como MVP no `package.json` e no `README.md`. Pelo codigo atual, o MVP nao implementa:

- multi-tenancy;
- refresh token;
- auditoria dedicada;
- rastreamento distribuido;
- permissoes por propriedade de recurso;
- healthcheck de banco de dados;
- remocao fisica de clientes.

## 4. Stack E Tecnologias

- Linguagem: TypeScript.
- Runtime: Node.js `>=22.0.0`.
- Gerenciador: npm `>=10.0.0`.
- Framework: NestJS 11.
- Banco de dados: PostgreSQL.
- ORM: Prisma.
- Autenticacao: JWT com Passport.
- Hash de senha: bcrypt.
- Validacao: class-validator e class-transformer.
- Documentacao API: Swagger/OpenAPI via `@nestjs/swagger`.
- Seguranca HTTP: Helmet.
- CORS: configuravel por variaveis de ambiente.
- Rate limiting: `@nestjs/throttler`.
- Logs: `nestjs-pino`, `pino`, `pino-http`.
- Testes: Jest e Supertest.
- Containers: Dockerfile e Docker Compose.
- Qualidade: ESLint e Prettier.

## 5. Arquitetura Do Backend

O backend segue uma arquitetura modular baseada no NestJS. Cada dominio possui um modulo proprio, geralmente composto por controller, service, DTOs e, quando o fluxo exige mais coordenacao, use-cases.

### Organizacao Geral

- Controllers recebem requisicoes HTTP, aplicam guards e delegam para services.
- DTOs definem contratos de entrada e validacoes.
- Services concentram operacoes de aplicacao e persistencia.
- Use-cases encapsulam fluxos com regras de negocio mais fortes.
- PrismaService centraliza o acesso ao banco via Prisma Client.
- Guards aplicam autenticacao e autorizacao.
- Filtro global padroniza respostas de erro.

### Decisoes Arquiteturais Relevantes

- API com prefixo global configuravel por `API_PREFIX`.
- Versionamento por URI com versao padrao `v1`.
- Validacao global com `whitelist`, `forbidNonWhitelisted` e transformacao.
- RBAC por decorators `@Roles(...)` e `RolesGuard`.
- Transacoes Prisma em fluxos sensiveis, como atualizacao de orcamento, conversao em OS, baixa de estoque e pagamento.
- Ordenacao protegida por allowlist de campos usando `buildSafeOrderBy`.
- Paginacao padronizada com resposta `{ data, meta }`.

## 6. Estrutura De Pastas

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

- `src/main.ts`: bootstrap da aplicacao, prefixo global, versionamento, CORS, Helmet, Swagger, pipes e shutdown hooks do Prisma.
- `src/app.module.ts`: composicao dos modulos, logger, rate limiting e filtro global.
- `src/auth`: login, registro protegido, JWT strategy e guard.
- `src/users`: gestao de usuarios internos e mecanicos.
- `src/clients`: cadastro, listagem, atualizacao e inativacao de clientes.
- `src/vehicles`: cadastro, listagem, atualizacao e historico de veiculos.
- `src/budgets`: criacao, atualizacao, aprovacao e reprovacao de orcamentos.
- `src/budget-conversions`: conversao de orcamento aprovado em OS.
- `src/service-orders`: ordens de servico, status e pecas utilizadas.
- `src/service-catalog`: catalogo de servicos.
- `src/inventory`: estoque, alertas e movimentacoes.
- `src/financial`: lancamentos financeiros, pagamento e resumo.
- `src/dashboard`: indicadores operacionais.
- `src/health`: healthcheck simples.
- `src/common`: guards, decorators, enums, filtros, DTOs e utilitarios compartilhados.
- `src/config`: configuracao e validacao de ambiente.
- `prisma/schema.prisma`: modelo de dados.
- `prisma/seed.ts`: seed opcional de administrador.

## 7. Dominio De Negocio

### Entidades Principais

- `User`: usuario interno do sistema.
- `Client`: cliente da oficina.
- `Vehicle`: veiculo vinculado a um cliente.
- `Budget`: orcamento para um cliente e veiculo.
- `BudgetItem`: item de orcamento, podendo representar peca, mao de obra ou ambos.
- `ServiceOrder`: ordem de servico.
- `ServiceOrderPart`: peca efetivamente usada em uma OS.
- `InventoryItem`: item de estoque.
- `InventoryMovement`: movimentacao de estoque.
- `FinancialEntry`: lancamento financeiro a pagar ou receber.
- `VehicleHistory`: historico de atendimento do veiculo.
- `ServiceCatalogItem`: servico catalogado com precificacao e regras.

### Regras Importantes

- Um veiculo deve pertencer ao cliente informado em orcamentos e ordens de servico.
- Orcamentos so podem ser atualizados enquanto estao `PENDENTE`.
- Orcamentos so podem ser aprovados ou reprovados se estiverem `PENDENTE`.
- Apenas orcamentos `APROVADO` podem ser convertidos em OS.
- Um orcamento nao pode ser convertido mais de uma vez.
- A OS segue transicoes controladas de status.
- A entrega (`ENTREGUE`) so pode ocorrer apos finalizacao (`FINALIZADA`).
- Pecas adicionadas em OS consomem estoque.
- O sistema bloqueia consumo quando o estoque e insuficiente.
- Ao finalizar OS, o historico do veiculo e criado ou atualizado.
- Ao entregar OS, o backend cria uma conta a receber quando houver valor positivo e ainda nao existir uma.
- Clientes sao inativados via soft delete (`isActive=false`).

## 8. Banco De Dados

O banco e modelado em Prisma usando PostgreSQL.

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

### Constraints E Relacionamentos Relevantes

- `User.email` e unico.
- `Client.document` e unico quando informado.
- `Vehicle.plate` e unico.
- `Vehicle` possui unique composto `[id, clientId]`.
- `Budget.code` e unico.
- `Budget.vehicle` referencia o par `[vehicleId, clientId]`, garantindo coerencia cliente-veiculo.
- `ServiceOrder.orderNumber` e unico.
- `ServiceOrder.budgetId` e unico e opcional.
- `ServiceOrder.vehicle` tambem referencia `[vehicleId, clientId]`.
- `ServiceOrderPart` possui unique composto `[serviceOrderId, inventoryItemId]`.
- `InventoryItem.internalCode` e unico.
- `ServiceCatalogItem.code` e unico.
- `VehicleHistory.serviceOrderId` e unico quando vinculado.

### Migrations

Existem migrations em `prisma/migrations`, incluindo:

- inicializacao do schema;
- remocao de campo de chassis de veiculo;
- criacao de catalogo de servicos;
- remocao de tempo estimado do catalogo;
- vinculo entre itens de orcamento e catalogo;
- renumeracao sequencial de ordens de servico;
- vinculos financeiros e de estoque;
- adicao de movimentacoes de inventario.

### Seed

O seed (`prisma/seed.ts`) cria um usuario administrador somente se as variaveis abaixo estiverem definidas:

- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_PASSWORD`
- `SEED_ADMIN_NAME`

Se o e-mail ja existir, o usuario nao e recriado.

## 9. Autenticacao E Autorizacao

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

O token contem:

- `sub`: id do usuario;
- `email`: e-mail;
- `role`: papel de acesso.

A `JwtStrategy` valida:

- assinatura com `JWT_SECRET`;
- expiracao;
- issuer;
- audience;
- existencia do usuario;
- usuario ativo;
- compatibilidade entre `payload.sub` e usuario encontrado por e-mail.

### Autorizacao

A autorizacao usa:

- `JwtAuthGuard` para exigir Bearer token;
- `RolesGuard` para verificar roles exigidas via `@Roles(...)`.

Mensagem de acesso negado:

```json
{
  "statusCode": 403,
  "message": "Voce nao tem permissao para acessar este recurso",
  "path": "/api/v1/recurso",
  "timestamp": "2026-05-06T12:00:00.000Z"
}
```

## 10. Endpoints / API

As rotas usam prefixo global e versionamento. Com `.env.example`, a base e:

```text
http://localhost:3000/api/v1
```

O healthcheck e registrado como `@Controller('health')`. Como o versionamento global por URI esta habilitado com versao padrao `1`, a rota esperada no padrao do projeto e `GET /api/v1/health`.

### Auth

#### `POST /auth/login`

- Autenticacao: nao exige JWT.
- Rate limit especifico: 5 requisicoes por 60 segundos.
- Body:

```json
{
  "email": "admin@example.com",
  "password": "Admin123"
}
```

- Erros: `400` payload invalido, `401` credenciais invalidas, `429` rate limit.

#### `POST /auth/register`

- Autenticacao: JWT.
- Roles: `ADMIN`.
- Cria usuario e retorna token para o usuario criado.

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

- Autenticacao: JWT.
- Retorna usuario autenticado sem `passwordHash`.

### Users

Todas as rotas exigem JWT e role `ADMIN`.

| Metodo  | Rota         | Descricao            |
| ------- | ------------ | -------------------- |
| `POST`  | `/users`     | Cria usuario interno |
| `GET`   | `/users`     | Lista usuarios       |
| `GET`   | `/users/:id` | Obtem usuario por id |
| `PATCH` | `/users/:id` | Atualiza usuario     |

Query de listagem: `page`, `limit`, `search`, `sortBy`, `sortOrder`, `role`, `active`.

Campos ordenaveis: `name`, `email`, `role`, `createdAt`, `updatedAt`, `lastLoginAt`.

Body de criacao:

```json
{
  "name": "Financeiro",
  "email": "financeiro@example.com",
  "password": "Financeiro123",
  "role": "FINANCEIRO",
  "isActive": true
}
```

Erros relevantes: `409 Usuario ja existe`, `404 Usuario nao encontrado`.

### Mechanics

Todas as rotas exigem JWT e role `ADMIN`.

| Metodo  | Rota             | Descricao             |
| ------- | ---------------- | --------------------- |
| `POST`  | `/mechanics`     | Cria mecanico interno |
| `GET`   | `/mechanics`     | Lista mecanicos       |
| `GET`   | `/mechanics/:id` | Obtem mecanico        |
| `PATCH` | `/mechanics/:id` | Atualiza mecanico     |

Body:

```json
{
  "name": "Joao Mecanico",
  "isActive": true
}
```

Observacao: o backend gera e-mail interno no formato aproximado `nome.timestamp@internal.local` e uma senha interna aleatoria, mas a resposta sanitizada nao retorna a senha gerada.

### Clients

Exige JWT e `ADMIN` ou `ATENDENTE`.

| Metodo   | Rota           | Descricao                  |
| -------- | -------------- | -------------------------- |
| `POST`   | `/clients`     | Cria cliente               |
| `GET`    | `/clients`     | Lista clientes             |
| `GET`    | `/clients/:id` | Obtem cliente com veiculos |
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

Campos ordenaveis: `name`, `createdAt`, `updatedAt`.

Erros relevantes: documento duplicado, cliente nao encontrado.

### Vehicles

| Metodo                      | Rota                 | Roles                            |
| --------------------------- | -------------------- | -------------------------------- |
| `POST /vehicles`            | Cria veiculo         | `ADMIN`, `ATENDENTE`             |
| `GET /vehicles`             | Lista veiculos       | `ADMIN`, `ATENDENTE`             |
| `GET /vehicles/:id`         | Obtem veiculo        | `ADMIN`, `ATENDENTE`, `MECANICO` |
| `PATCH /vehicles/:id`       | Atualiza veiculo     | `ADMIN`, `ATENDENTE`             |
| `GET /vehicles/:id/history` | Historico do veiculo | `ADMIN`, `ATENDENTE`, `MECANICO` |

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
  "notes": "Revisao preventiva"
}
```

Regras:

- placa e armazenada em uppercase;
- placa deve ser unica;
- cliente informado deve existir e estar ativo.

### Budgets

| Metodo                                       | Rota               | Roles                              |
| -------------------------------------------- | ------------------ | ---------------------------------- |
| `POST /budgets`                              | Cria orcamento     | `ADMIN`, `ATENDENTE`               |
| `GET /budgets`                               | Lista orcamentos   | `ADMIN`, `ATENDENTE`, `FINANCEIRO` |
| `GET /budgets/:id`                           | Obtem orcamento    | `ADMIN`, `ATENDENTE`, `FINANCEIRO` |
| `PATCH /budgets/:id`                         | Atualiza orcamento | `ADMIN`, `ATENDENTE`               |
| `PATCH /budgets/:id/approve`                 | Aprova orcamento   | `ADMIN`, `ATENDENTE`               |
| `PATCH /budgets/:id/reject`                  | Reprova orcamento  | `ADMIN`, `ATENDENTE`               |
| `POST /budgets/:id/convert-to-service-order` | Converte em OS     | `ADMIN`, `ATENDENTE`               |

Body de criacao:

```json
{
  "clientId": "uuid",
  "vehicleId": "uuid",
  "problemDescription": "Barulho ao frear",
  "notes": "Cliente solicitou urgencia",
  "discount": 50,
  "items": [
    {
      "type": "LABOR",
      "description": "Diagnostico e troca de pastilhas",
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
- `discount` nao pode ser maior que o subtotal.
- `vehicleId` deve pertencer ao `clientId`.
- itens `LABOR` e `LABOR_AND_PART` podem referenciar servico ativo do catalogo.
- itens `PART` e `LABOR_AND_PART` exigem item de estoque valido quando usam peca.
- codigo do orcamento e gerado como `BUD-${Date.now()}`.
- atualizacao so e permitida quando o orcamento esta `PENDENTE`.
- aprovacao e reprovacao so sao permitidas quando esta `PENDENTE`.
- conversao so e permitida quando esta `APROVADO`.

Resposta de conversao:

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

| Metodo                             | Rota               | Roles                                          |
| ---------------------------------- | ------------------ | ---------------------------------------------- |
| `POST /service-orders`             | Cria OS            | `ADMIN`, `ATENDENTE`                           |
| `GET /service-orders`              | Lista OS           | `ADMIN`, `ATENDENTE`, `MECANICO`, `FINANCEIRO` |
| `GET /service-orders/:id`          | Obtem OS detalhada | `ADMIN`, `ATENDENTE`, `MECANICO`, `FINANCEIRO` |
| `PATCH /service-orders/:id`        | Atualiza OS        | `ADMIN`, `ATENDENTE`, `MECANICO`               |
| `PATCH /service-orders/:id/status` | Atualiza status    | `ADMIN`, `ATENDENTE`, `MECANICO`               |
| `POST /service-orders/:id/parts`   | Adiciona peca      | `ADMIN`, `ATENDENTE`, `MECANICO`               |
| `GET /service-orders/:id/parts`    | Lista pecas da OS  | `ADMIN`, `ATENDENTE`, `MECANICO`, `FINANCEIRO` |

Body de criacao:

```json
{
  "clientId": "uuid",
  "vehicleId": "uuid",
  "mechanicId": "uuid",
  "problemDescription": "Motor falhando",
  "diagnosis": "Falha em velas",
  "servicesPerformed": "Aguardando execucao",
  "vehicleChecklist": "Sem avarias aparentes",
  "expectedDeliveryAt": "2026-05-10",
  "notes": "Cliente pediu contato antes da troca"
}
```

Atualizacao de status:

```json
{
  "status": "FINALIZADA"
}
```

Transicoes permitidas:

- `ABERTA` -> `ABERTA`, `EM_ANDAMENTO`, `FINALIZADA`
- `EM_ANDAMENTO` -> `EM_ANDAMENTO`, `FINALIZADA`
- `FINALIZADA` -> `FINALIZADA`, `ENTREGUE`
- `ENTREGUE` -> `ENTREGUE`

Adicao de peca:

```json
{
  "inventoryItemId": "uuid",
  "quantity": 2,
  "unitPrice": 85.5
}
```

Regras:

- OS recebe numero sequencial `OS000001`, `OS000002`, etc.
- `expectedDeliveryAt` deve ser uma data valida, com ano de 4 digitos, e nao pode ser anterior ao dia atual.
- ao adicionar peca, o estoque e decrementado;
- se a peca ja existir na OS, a quantidade e acumulada;
- ao finalizar OS com orcamento, itens de estoque do orcamento sao consumidos se ainda nao estiverem em `ServiceOrderPart`;
- ao finalizar OS, historico do veiculo e registrado;
- ao entregar OS, uma conta a receber e criada quando houver valor positivo.

Observacao: ao validar `mechanicId`, o codigo verifica se o usuario existe, mas nao confirma explicitamente que a role e `MECANICO`.

### Services / Service Catalog

Base: `/services`.

| Metodo                           | Rota                     | Roles                                          |
| -------------------------------- | ------------------------ | ---------------------------------------------- |
| `POST /services`                 | Cria servico do catalogo | `ADMIN`, `ATENDENTE`                           |
| `GET /services`                  | Lista servicos           | `ADMIN`, `ATENDENTE`, `MECANICO`, `FINANCEIRO` |
| `GET /services/:id`              | Obtem servico            | `ADMIN`, `ATENDENTE`, `MECANICO`, `FINANCEIRO` |
| `PATCH /services/:id`            | Atualiza servico         | `ADMIN`, `ATENDENTE`                           |
| `PATCH /services/:id/activate`   | Ativa servico            | `ADMIN`, `ATENDENTE`                           |
| `PATCH /services/:id/deactivate` | Inativa servico          | `ADMIN`, `ATENDENTE`                           |

Body:

```json
{
  "code": "SRV-FREIO",
  "name": "Troca de pastilhas",
  "category": "Freios",
  "description": "Servico de substituicao de pastilhas",
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
- `code` e normalizado para uppercase;
- `name`, `category`, `description` e `internalNotes` sao aparados;
- `suggestedTotalPrice = laborPrice + productPrice`;
- `code` deve ser unico;
- `name` deve ser unico dentro da categoria, de forma case-insensitive;
- `LABOR_ONLY` exige `productPrice = 0`;
- `LABOR_ONLY` nao pode usar `materialSource=SHOP_SUPPLIES`;
- `NO_PARTS_REQUIRED` exige `productPrice = 0`;
- `PARTS_AND_LABOR` nao pode usar `NO_PARTS_REQUIRED`.

### Inventory

| Metodo                            | Rota                          | Roles                              |
| --------------------------------- | ----------------------------- | ---------------------------------- |
| `POST /inventory`                 | Cria item de estoque          | `ADMIN`, `ATENDENTE`               |
| `GET /inventory`                  | Lista itens                   | `ADMIN`, `ATENDENTE`, `FINANCEIRO` |
| `GET /inventory/alerts/low-stock` | Alertas de baixo estoque      | `ADMIN`, `ATENDENTE`               |
| `GET /inventory/:id/movements`    | Ultimas movimentacoes do item | `ADMIN`, `ATENDENTE`, `FINANCEIRO` |
| `GET /inventory/:id`              | Obtem item                    | `ADMIN`, `ATENDENTE`, `FINANCEIRO` |
| `PATCH /inventory/:id`            | Atualiza item                 | `ADMIN`, `ATENDENTE`               |

Body:

```json
{
  "name": "Filtro de oleo",
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
- codigo interno deve ser unico;
- alteracao manual de quantidade gera movimentacao `ADJUSTMENT`;
- consumo em OS gera movimentacao `OUT`;
- estoque baixo e calculado quando `quantity <= minimumQuantity * 1.5`;
- endpoint de movimentacoes retorna ate 8 registros mais recentes.

### Financial

| Metodo                     | Rota                | Roles                 |
| -------------------------- | ------------------- | --------------------- |
| `POST /financial`          | Cria lancamento     | `ADMIN`, `FINANCEIRO` |
| `GET /financial`           | Lista lancamentos   | `ADMIN`, `FINANCEIRO` |
| `GET /financial/summary`   | Resumo financeiro   | `ADMIN`, `FINANCEIRO` |
| `GET /financial/:id`       | Obtem lancamento    | `ADMIN`, `FINANCEIRO` |
| `PATCH /financial/:id`     | Atualiza lancamento | `ADMIN`, `FINANCEIRO` |
| `PATCH /financial/:id/pay` | Marca como pago     | `ADMIN`, `FINANCEIRO` |

Body de criacao:

```json
{
  "type": "RECEIVABLE",
  "description": "Pagamento OS000001",
  "category": "Ordem de Servico",
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

- se `dueDate` for anterior ao momento atual, status inicial e `VENCIDO`; caso contrario, `PENDENTE`;
- listagem e consulta sincronizam lancamentos pendentes vencidos;
- lancamentos `PAGO` nao podem ser atualizados;
- lancamento ja pago nao pode ser pago novamente;
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
- Retorna indicadores de OS, orcamentos, financeiro e estoque.

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
        "name": "Filtro de oleo",
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

- Autenticacao: nao exige JWT.
- Retorna status simples da aplicacao.

```json
{
  "status": "ok",
  "timestamp": "2026-05-06T12:00:00.000Z"
}
```

Observacao: nao ha verificacao explicita de conectividade com banco nesse endpoint.

## 11. Regras De Validacao

O `ValidationPipe` global esta configurado com:

- `whitelist: true`;
- `forbidNonWhitelisted: true`;
- `transform: true`;
- `enableImplicitConversion: true`;
- mensagens formatadas por `formatValidationMessages`.

Isso significa que:

- campos nao declarados em DTOs sao rejeitados;
- query params numericos podem ser convertidos;
- payloads invalidos retornam `400 Bad Request`;
- detalhes de `target` e `value` nao sao expostos.

### Validacoes Relevantes

- Senhas de usuario: minimo de 8 caracteres e regex exigindo minuscula, maiuscula e numero.
- Login: e-mail valido e senha com minimo de 8 caracteres.
- UUIDs: IDs em body e params usam validacao de UUID.
- Paginacao: `page >= 1`, `limit` entre 1 e 100.
- Ordenacao: `sortOrder` aceita apenas `asc` ou `desc`.
- Valores monetarios: maximo de 2 casas decimais e minimo zero quando aplicavel.
- Quantidades: inteiros ou numeros positivos conforme DTO.
- Datas: `IsDateString` para campos de data enviados como string.
- `expectedDeliveryAt`: validacao adicional de data real, ano com 4 digitos e nao anterior ao dia atual.

## 12. Tratamento De Erros

O filtro global `HttpExceptionFilter` captura excecoes e responde no formato:

```json
{
  "statusCode": 400,
  "message": "Mensagem do erro",
  "path": "/api/v1/recurso",
  "timestamp": "2026-05-06T12:00:00.000Z"
}
```

Para erros `5xx`, o filtro registra log com:

- excecao;
- metodo HTTP;
- URL.

### Codigos Mais Comuns

- `400 Bad Request`: validacao, regra de negocio ou transicao invalida.
- `401 Unauthorized`: token ausente/invalido ou credenciais invalidas.
- `403 Forbidden`: role sem permissao.
- `404 Not Found`: recurso inexistente.
- `409 Conflict`: duplicidade ou conflito de estado.
- `429 Too Many Requests`: limite de requisicoes excedido.
- `500 Internal Server Error`: falha inesperada.

## 13. Seguranca

### Praticas Implementadas

- JWT Bearer para endpoints protegidos.
- RBAC por roles.
- bcrypt para hash de senha.
- Helmet habilitado globalmente.
- CORS configuravel.
- Bloqueio de `CORS_ORIGIN=*` na validacao de ambiente.
- Rate limiting global via `ThrottlerGuard`.
- Throttle mais restritivo em login.
- `ValidationPipe` com rejeicao de campos extras.
- Redaction de dados sensiveis em logs.
- Validacao de `JWT_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE` e Swagger em producao.
- Usuarios retornados sem `passwordHash`.

### Pontos De Atencao

- Nao ha refresh token.
- Nao ha auditoria dedicada.
- Nao ha MFA.
- Nao ha policies por propriedade de recurso.
- Nao ha confirmacao explicita de role `MECANICO` ao associar `mechanicId` em OS.

## 14. Logs, Observabilidade E Monitoramento

O projeto usa `nestjs-pino` com `pino-http`.

Dados sensiveis mascarados:

- `req.headers.authorization`;
- `req.body.password`;
- `res.headers["set-cookie"]`.

O nivel de log vem de `LOG_LEVEL`.

Existe healthcheck simples em `/health`, mas nao ha:

- endpoint de readiness/liveness separado;
- verificacao de banco no healthcheck;
- metricas Prometheus;
- tracing distribuido;
- correlacao explicita por request id no codigo analisado.

## 15. Configuracao Do Ambiente

Variaveis reais do projeto:

| Variavel              | Obrigatoria | Descricao                                 |
| --------------------- | ----------- | ----------------------------------------- |
| `NODE_ENV`            | Sim         | `development`, `test` ou `production`     |
| `PORT`                | Sim         | Porta HTTP                                |
| `APP_NAME`            | Sim         | Nome da aplicacao                         |
| `APP_VERSION`         | Sim         | Versao da aplicacao                       |
| `API_PREFIX`          | Sim         | Prefixo global da API                     |
| `DATABASE_URL`        | Sim         | URL PostgreSQL usada pelo Prisma          |
| `JWT_SECRET`          | Sim         | Segredo de assinatura JWT                 |
| `JWT_EXPIRES_IN`      | Sim         | Expiracao do token                        |
| `JWT_ISSUER`          | Producao    | Emissor esperado no JWT                   |
| `JWT_AUDIENCE`        | Producao    | Audiencia esperada no JWT                 |
| `BCRYPT_SALT_ROUNDS`  | Sim         | Custo bcrypt, entre 10 e 15               |
| `CORS_ORIGIN`         | Sim         | Origens permitidas, separadas por virgula |
| `CORS_CREDENTIALS`    | Nao         | Habilita credenciais CORS                 |
| `THROTTLE_TTL`        | Sim         | Janela de rate limit em segundos          |
| `THROTTLE_LIMIT`      | Sim         | Limite de requisicoes por janela          |
| `LOG_LEVEL`           | Sim         | Nivel de log                              |
| `ENABLE_SWAGGER`      | Nao         | Habilita Swagger fora de producao         |
| `SEED_ADMIN_EMAIL`    | Nao         | E-mail do admin criado no seed            |
| `SEED_ADMIN_PASSWORD` | Nao         | Senha do admin criado no seed             |
| `SEED_ADMIN_NAME`     | Nao         | Nome do admin criado no seed              |

Em producao, a validacao bloqueia:

- `JWT_SECRET` com menos de 32 caracteres;
- secrets fracos como `secret`, `changeme`, `change-me`, `jwt-secret`;
- ausencia de `JWT_ISSUER`;
- ausencia de `JWT_AUDIENCE`;
- `ENABLE_SWAGGER=true`;
- wildcard em `CORS_ORIGIN`.

## 16. Como Rodar O Projeto

### Pre-requisitos

- Node.js `>=22.0.0`.
- npm `>=10.0.0`.
- PostgreSQL disponivel.
- Docker e Docker Compose, se usar banco em container.

### Instalacao

```bash
npm install
```

### Banco Com Docker Compose

```bash
docker compose up -d postgres
```

O `docker-compose.yml` define:

- PostgreSQL 16 Alpine;
- banco `oficina_db`;
- usuario `postgres`;
- senha `postgres`;
- volume `postgres_data`.

### Configuracao Local

```bash
cp .env.example .env
```

Depois ajuste os valores sensiveis.

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

API local padrao:

```text
http://localhost:3000/api/v1
```

Swagger, quando habilitado e fora de producao:

```text
http://localhost:3000/docs
```

### Producao

```bash
npm run build
npm run prisma:migrate:deploy
npm run start
```

### Docker

```bash
docker compose up -d --build
```

O servico `api` executa:

```bash
npm run prisma:generate && npm run prisma:migrate:deploy && npm run start
```

### Scripts

| Script                          | Descricao                     |
| ------------------------------- | ----------------------------- |
| `npm run build`                 | Compila NestJS para `dist/`   |
| `npm run start`                 | Executa `node dist/main.js`   |
| `npm run start:dev`             | Executa em watch              |
| `npm run start:debug`           | Executa com debug             |
| `npm run lint`                  | Roda ESLint                   |
| `npm run format`                | Roda Prettier                 |
| `npm run test`                  | Testes unitarios              |
| `npm run test:watch`            | Testes em watch               |
| `npm run test:cov`              | Testes com cobertura          |
| `npm run test:e2e`              | Testes end-to-end             |
| `npm run prisma:generate`       | Gera Prisma Client            |
| `npm run prisma:migrate`        | Migrations em desenvolvimento |
| `npm run prisma:migrate:deploy` | Aplica migrations existentes  |
| `npm run prisma:seed`           | Executa seed                  |

## 17. Testes

O projeto possui testes unitarios em varios modulos:

- autenticacao JWT;
- validacao de ambiente;
- validacao de input;
- utilitarios de data, ordenacao e paginacao;
- catalogo de servicos;
- orcamentos;
- conversao de orcamentos;
- ordens de servico;
- estoque;
- financeiro;
- dashboard.

Tambem existe configuracao e teste e2e em `test/`.

### Execucao

```bash
npm run test
npm run test:cov
npm run test:e2e
```

### Observacoes

O codigo possui cobertura direcionada para regras importantes, mas a documentacao nao deve assumir cobertura completa de todos os endpoints. Para validar cobertura real, use `npm run test:cov`.

## 18. Boas Praticas E Padroes Do Projeto

- Modulos por dominio.
- DTOs com validacao explicita.
- Sanitizacao de usuario removendo `passwordHash`.
- Guards de autenticacao e autorizacao separados.
- Use-cases para fluxos de negocio mais complexos.
- Transacoes Prisma para operacoes que alteram multiplas entidades.
- Ordenacao com allowlist para evitar campos arbitrarios.
- Paginacao padronizada.
- Redaction de credenciais em logs.
- Validacao forte de variaveis de ambiente.
- Swagger desabilitado em producao por validacao.

## 19. Limitacoes Atuais E Melhorias Futuras

Pontos observados no codigo atual:

- Implementar refresh token e estrategia de renovacao segura.
- Validar explicitamente que `mechanicId` pertence a um usuario com role `MECANICO`.
- Criar healthcheck de banco de dados.
- Adicionar auditoria de acoes sensiveis.
- Evoluir observabilidade com metricas e tracing.
- Avaliar request id/correlation id em logs.
- Criar politicas por propriedade de recurso, se houver necessidade de isolamento por usuario ou unidade.
- Revisar fluxo de criacao de mecanico, pois a senha interna gerada nao e exposta nem ha fluxo visivel de primeiro acesso no backend.
- Considerar endpoints especificos para ajustes de estoque, em vez de depender apenas de `PATCH /inventory/:id`.
- Documentar contratos OpenAPI com exemplos mais completos diretamente nos decorators Swagger, se desejado.

## 20. Glossario

- **OS**: ordem de servico.
- **Orcamento**: proposta de servicos/pecas para um cliente e veiculo.
- **Item de orcamento**: linha do orcamento, classificada como peca, mao de obra ou ambos.
- **Catalogo de servicos**: base de servicos reutilizaveis com regras de preco e material.
- **Estoque baixo**: item cuja quantidade esta abaixo ou igual a `minimumQuantity * 1.5`.
- **Lancamento financeiro**: conta a pagar ou receber.
- **Receivable**: valor a receber.
- **Payable**: valor a pagar.
- **RBAC**: controle de acesso baseado em papeis.
- **JWT**: token assinado usado para autenticar requisicoes.
- **Soft delete**: inativacao logica sem remover registro fisicamente.
