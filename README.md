# Oficina Backend

Backend do sistema SaaS de gestão para oficina mecânica. A API centraliza os fluxos operacionais do produto, incluindo autenticação, usuários, clientes, veículos, orçamentos, ordens de serviço, catálogo de serviços, estoque, financeiro, dashboard e healthcheck.

O projeto foi construído com NestJS, TypeScript, PostgreSQL e Prisma, com foco em uma base modular, validada por DTOs, protegida por JWT/roles e preparada para execução local ou em container.

## Principais responsabilidades

- Autenticar usuários e emitir tokens JWT.
- Controlar acesso por perfis: `ADMIN`, `ATENDENTE`, `MECANICO` e `FINANCEIRO`.
- Gerenciar clientes, veículos e histórico de atendimento.
- Criar, aprovar, reprovar e converter orçamentos em ordens de serviço.
- Controlar ordens de serviço, peças utilizadas e mudanças de status.
- Manter catálogo de serviços e itens de estoque.
- Registrar movimentações de estoque e bloquear estoque negativo.
- Gerar e gerenciar lançamentos financeiros.
- Expor indicadores consolidados para dashboard.
- Disponibilizar documentação Swagger e endpoint de healthcheck.

## Stack e tecnologias

- Node.js 22+
- npm 10+
- NestJS 11
- TypeScript
- PostgreSQL 16
- Prisma ORM
- JWT com Passport
- bcrypt
- class-validator e class-transformer
- Swagger/OpenAPI
- Helmet
- CORS configurável
- NestJS Throttler
- nestjs-pino/Pino para logs
- Jest e Supertest
- Docker e Docker Compose

## Pré-requisitos

- Node.js `>=22.0.0`
- npm `>=10.0.0`
- Docker e Docker Compose, caso use o PostgreSQL via container
- PostgreSQL disponível localmente ou via container

## Instalação

Instale as dependências:

```bash
npm install
```

Suba o PostgreSQL do projeto:

```bash
docker compose up -d postgres
```

Gere o Prisma Client:

```bash
npm run prisma:generate
```

## Configuração do ambiente

O projeto carrega variáveis a partir de `.env`. Atualmente não há um `.env.example` versionado, então crie o arquivo `.env` na raiz do backend usando as variáveis abaixo como referência.

Exemplo para desenvolvimento local:

```env
NODE_ENV=development
PORT=3000
APP_NAME=Oficina Backend API
APP_VERSION=1.0.0
API_PREFIX=api
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/oficina_db?schema=public
JWT_SECRET=change-this-local-secret-with-at-least-32-characters
JWT_EXPIRES_IN=15m
JWT_ISSUER=oficina-backend-api
JWT_AUDIENCE=oficina-web
BCRYPT_SALT_ROUNDS=12
CORS_ORIGIN=http://localhost:3000,http://localhost:5173
CORS_CREDENTIALS=false
THROTTLE_TTL=60
THROTTLE_LIMIT=100
LOG_LEVEL=debug
ENABLE_SWAGGER=true
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=admin123456
SEED_ADMIN_NAME=Admin
```

Variáveis obrigatórias validadas na inicialização:

| Variável             | Uso                                                   |
| -------------------- | ----------------------------------------------------- |
| `NODE_ENV`           | Ambiente: `development`, `test` ou `production`.      |
| `PORT`               | Porta HTTP da API.                                    |
| `APP_NAME`           | Nome usado na aplicação e no Swagger.                 |
| `APP_VERSION`        | Versão exibida na documentação.                       |
| `API_PREFIX`         | Prefixo global das rotas. Exemplo: `api`.             |
| `DATABASE_URL`       | URL de conexão PostgreSQL usada pelo Prisma.          |
| `JWT_SECRET`         | Chave de assinatura dos tokens JWT.                   |
| `JWT_EXPIRES_IN`     | Tempo de expiração do JWT.                            |
| `BCRYPT_SALT_ROUNDS` | Custo do hash de senha. Deve ficar entre `10` e `15`. |
| `CORS_ORIGIN`        | Lista de origens permitidas, separadas por vírgula.   |
| `THROTTLE_TTL`       | Janela de rate limit em segundos.                     |
| `THROTTLE_LIMIT`     | Limite de requisições por janela.                     |
| `LOG_LEVEL`          | Nível de log do Pino.                                 |

Variáveis opcionais:

| Variável              | Uso                                                                 |
| --------------------- | ------------------------------------------------------------------- |
| `JWT_ISSUER`          | Emissor do JWT. Obrigatório em produção.                            |
| `JWT_AUDIENCE`        | Audiência do JWT. Obrigatória em produção.                          |
| `CORS_CREDENTIALS`    | Habilita credenciais em CORS quando `true`.                         |
| `ENABLE_SWAGGER`      | Habilita Swagger fora de produção. Não pode ser `true` em produção. |
| `SEED_ADMIN_EMAIL`    | E-mail do administrador criado pelo seed.                           |
| `SEED_ADMIN_PASSWORD` | Senha do administrador criado pelo seed.                            |
| `SEED_ADMIN_NAME`     | Nome do administrador criado pelo seed.                             |

Em produção, a validação bloqueia `JWT_SECRET` fraco, `CORS_ORIGIN=*`, Swagger habilitado e ausência de `JWT_ISSUER`/`JWT_AUDIENCE`.

## Banco de dados, migrations e seed

O schema do Prisma está em `prisma/schema.prisma` e usa PostgreSQL.

Para aplicar migrations em desenvolvimento:

```bash
npm run prisma:migrate
```

Para aplicar migrations em produção ou ambientes controlados:

```bash
npm run prisma:migrate:deploy
```

Para executar o seed:

```bash
npm run prisma:seed
```

O seed cria um usuário administrador somente quando `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` e `SEED_ADMIN_NAME` estiverem definidos. Se o usuário já existir, ele não é recriado.

## Execução local

Fluxo recomendado para subir a API localmente:

```bash
docker compose up -d postgres
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run start:dev
```

Por padrão, com `PORT=3000` e `API_PREFIX=api`, a API fica disponível em:

```text
http://localhost:3000/api/v1
```

Healthcheck:

```text
GET http://localhost:3000/api/v1/health
```

## Execução em desenvolvimento

Use o modo watch do NestJS:

```bash
npm run start:dev
```

Para depuração:

```bash
npm run start:debug
```

## Execução em produção

Build da aplicação:

```bash
npm run build
```

Aplicação das migrations:

```bash
npm run prisma:migrate:deploy
```

Inicialização:

```bash
npm run start
```

Também é possível subir API e PostgreSQL com Docker Compose:

```bash
docker compose up -d --build
```

O serviço `api` do `docker-compose.yml` executa `prisma:generate`, `prisma:migrate:deploy` e `start`.

## Scripts disponíveis

| Script                          | Descrição                                                          |
| ------------------------------- | ------------------------------------------------------------------ |
| `npm run build`                 | Compila o projeto NestJS para `dist/`.                             |
| `npm run start`                 | Executa a aplicação compilada com `node dist/main.js`.             |
| `npm run start:dev`             | Executa em modo desenvolvimento com watch.                         |
| `npm run start:debug`           | Executa em modo debug com watch.                                   |
| `npm run lint`                  | Roda ESLint em `src`, `test` e `prisma`.                           |
| `npm run format`                | Formata arquivos TypeScript, JSON, Markdown e YAML com Prettier.   |
| `npm run test`                  | Roda testes unitários com Jest.                                    |
| `npm run test:watch`            | Roda testes em modo watch.                                         |
| `npm run test:cov`              | Roda testes com cobertura.                                         |
| `npm run test:e2e`              | Roda testes end-to-end com a configuração de `test/jest-e2e.json`. |
| `npm run prisma:generate`       | Gera o Prisma Client.                                              |
| `npm run prisma:migrate`        | Aplica/cria migrations em desenvolvimento.                         |
| `npm run prisma:migrate:deploy` | Aplica migrations existentes em ambientes controlados/produção.    |
| `npm run prisma:seed`           | Executa o seed de administrador.                                   |

## Testes

Testes unitários:

```bash
npm run test
```

Testes com cobertura:

```bash
npm run test:cov
```

Testes end-to-end:

```bash
npm run test:e2e
```

## Documentação da API

Quando `ENABLE_SWAGGER=true` e `NODE_ENV` não é `production`, a documentação fica disponível em:

```text
http://localhost:3000/docs
```

A API usa token Bearer JWT. No Swagger, use o botão de autorização para informar o token retornado por:

```text
POST /api/v1/auth/login
```

## Estrutura de pastas

```text
src/
  auth/                 Autenticação, JWT, login e registro protegido
  budget-conversions/   Conversão de orçamento aprovado em ordem de serviço
  budgets/              Orçamentos, itens, aprovação e reprovação
  clients/              Cadastro e consulta de clientes
  common/               Decorators, guards, filtros, enums, DTOs e utilitários
  config/               Configuração e validação de variáveis de ambiente
  dashboard/            Indicadores consolidados
  financial/            Lançamentos, pagamentos e resumo financeiro
  health/               Healthcheck da aplicação
  inventory/            Itens de estoque, alertas e movimentações
  prisma/               PrismaService e módulo de acesso a dados
  service-catalog/      Catálogo de serviços
  service-orders/       Ordens de serviço, status e peças utilizadas
  users/                Usuários e mecânicos
  vehicles/             Veículos e histórico
prisma/
  migrations/           Histórico de migrations SQL
  schema.prisma         Modelagem do banco
  seed.ts               Seed opcional de admin
test/
  app.e2e-spec.ts       Teste end-to-end base
```

## Arquitetura e padrões adotados

- Aplicação modular por domínio, seguindo os módulos do NestJS.
- Controllers focados em contrato HTTP, guards e documentação Swagger.
- Services e use cases concentram regras de negócio.
- DTOs com `class-validator` e `class-transformer`.
- `ValidationPipe` global com `whitelist`, `forbidNonWhitelisted` e transformação automática.
- Prisma centralizado em `PrismaService`.
- Transações Prisma em fluxos sensíveis de orçamento, ordem de serviço e estoque.
- Versionamento de API por URI com versão padrão `v1`.
- Prefixo global configurável via `API_PREFIX`.
- Filtro global de exceções HTTP para padronizar erros e registrar logs.

## Autenticação e autorização

Rotas protegidas usam `JwtAuthGuard`. Rotas com controle por perfil usam também `RolesGuard`.

Fluxos principais:

- `POST /api/v1/auth/login`: autentica e retorna JWT.
- `POST /api/v1/auth/register`: cria usuário, restrito a `ADMIN`.
- `GET /api/v1/auth/me`: retorna o usuário autenticado.

Perfis existentes:

- `ADMIN`
- `ATENDENTE`
- `MECANICO`
- `FINANCEIRO`

## Segurança e boas práticas

- Senhas armazenadas com bcrypt.
- JWT com segredo e expiração configuráveis.
- `Helmet` habilitado.
- CORS restrito por variável de ambiente.
- Rate limit global com `@nestjs/throttler`.
- Rate limit específico no login.
- Logs HTTP com mascaramento de `Authorization`, senha e `set-cookie`.
- Stack trace não é exposto em respostas de erro.
- Validação de ambiente na inicialização.
- Validações de segurança adicionais para produção.
- Regras de integridade no Prisma e no banco para relações, unicidade e consistência de dados.

## Observabilidade e healthcheck

Logs são emitidos com `nestjs-pino`/Pino e nível configurável por `LOG_LEVEL`.

Healthcheck:

```text
GET /api/v1/health
```

Resposta esperada:

```json
{
  "status": "ok",
  "timestamp": "2026-05-05T00:00:00.000Z"
}
```

## Troubleshooting

Erro de validação de ambiente ao iniciar:

- Verifique se todas as variáveis obrigatórias existem no `.env`.
- Em produção, confirme `JWT_SECRET` com pelo menos 32 caracteres, `JWT_ISSUER`, `JWT_AUDIENCE` e `ENABLE_SWAGGER=false`.
- Verifique se `CORS_ORIGIN` não contém `*` nem origens vazias.

Erro de conexão com banco:

- Confirme se o PostgreSQL está rodando.
- Se usar Docker Compose, execute `docker compose up -d postgres`.
- Confira usuário, senha, host, porta e database em `DATABASE_URL`.

Erro relacionado ao Prisma Client:

- Execute `npm run prisma:generate`.
- Depois aplique as migrations com `npm run prisma:migrate` em desenvolvimento ou `npm run prisma:migrate:deploy` em produção.

Swagger não abre:

- Confirme `ENABLE_SWAGGER=true`.
- Confirme que `NODE_ENV` não está como `production`.
- Acesse `http://localhost:3000/docs`, não uma rota prefixada por `/api`.

## Observações importantes

- O backend não deve ser executado em produção com Swagger habilitado.
- O `docker-compose.yml` define `DATABASE_URL` interno apontando para o serviço `postgres`.
- O arquivo `.env` local não deve ser versionado.
- Antes de abrir PRs ou publicar mudanças, rode ao menos `npm run lint` e `npm run test`.

## Melhorias futuras

- Versionar um `.env.example` sem segredos para facilitar onboarding.
- Adicionar documentação de contratos externos, caso integrações sejam ativadas.
- Expandir testes end-to-end para os principais fluxos de negócio.
- Documentar estratégia de deploy quando o ambiente de produção estiver definido.
