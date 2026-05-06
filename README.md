# Oficina Backend

Backend do sistema SaaS de gestao para oficina mecanica. A API centraliza os fluxos operacionais do produto, incluindo autenticacao, usuarios, clientes, veiculos, orcamentos, ordens de servico, catalogo de servicos, estoque, financeiro, dashboard e healthcheck.

O projeto foi construido com NestJS, TypeScript, PostgreSQL e Prisma, com foco em uma base modular, validada por DTOs, protegida por JWT/roles e preparada para execucao local ou em container.

## Principais responsabilidades

- Autenticar usuarios e emitir tokens JWT.
- Controlar acesso por perfis: `ADMIN`, `ATENDENTE`, `MECANICO` e `FINANCEIRO`.
- Gerenciar clientes, veiculos e historico de atendimento.
- Criar, aprovar, reprovar e converter orcamentos em ordens de servico.
- Controlar ordens de servico, pecas utilizadas e mudancas de status.
- Manter catalogo de servicos e itens de estoque.
- Registrar movimentacoes de estoque e bloquear estoque negativo.
- Gerar e gerenciar lancamentos financeiros.
- Expor indicadores consolidados para dashboard.
- Disponibilizar documentacao Swagger e endpoint de healthcheck.

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
- CORS configuravel
- NestJS Throttler
- nestjs-pino/Pino para logs
- Jest e Supertest
- Docker e Docker Compose

## Pre-requisitos

- Node.js `>=22.0.0`
- npm `>=10.0.0`
- Docker e Docker Compose, caso use o PostgreSQL via container
- PostgreSQL disponivel localmente ou via container

## Instalacao

Instale as dependencias:

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

## Configuracao do ambiente

O projeto carrega variaveis a partir de `.env`. Atualmente nao ha um `.env.example` versionado, entao crie o arquivo `.env` na raiz do backend usando as variaveis abaixo como referencia.

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

Variaveis obrigatorias validadas na inicializacao:

| Variavel             | Uso                                                   |
| -------------------- | ----------------------------------------------------- |
| `NODE_ENV`           | Ambiente: `development`, `test` ou `production`.      |
| `PORT`               | Porta HTTP da API.                                    |
| `APP_NAME`           | Nome usado na aplicacao e no Swagger.                 |
| `APP_VERSION`        | Versao exibida na documentacao.                       |
| `API_PREFIX`         | Prefixo global das rotas. Exemplo: `api`.             |
| `DATABASE_URL`       | URL de conexao PostgreSQL usada pelo Prisma.          |
| `JWT_SECRET`         | Chave de assinatura dos tokens JWT.                   |
| `JWT_EXPIRES_IN`     | Tempo de expiracao do JWT.                            |
| `BCRYPT_SALT_ROUNDS` | Custo do hash de senha. Deve ficar entre `10` e `15`. |
| `CORS_ORIGIN`        | Lista de origens permitidas, separadas por virgula.   |
| `THROTTLE_TTL`       | Janela de rate limit em segundos.                     |
| `THROTTLE_LIMIT`     | Limite de requisicoes por janela.                     |
| `LOG_LEVEL`          | Nivel de log do Pino.                                 |

Variaveis opcionais:

| Variavel              | Uso                                                                 |
| --------------------- | ------------------------------------------------------------------- |
| `JWT_ISSUER`          | Emissor do JWT. Obrigatorio em producao.                            |
| `JWT_AUDIENCE`        | Audiencia do JWT. Obrigatorio em producao.                          |
| `CORS_CREDENTIALS`    | Habilita credenciais em CORS quando `true`.                         |
| `ENABLE_SWAGGER`      | Habilita Swagger fora de producao. Nao pode ser `true` em producao. |
| `SEED_ADMIN_EMAIL`    | E-mail do admin criado pelo seed.                                   |
| `SEED_ADMIN_PASSWORD` | Senha do admin criado pelo seed.                                    |
| `SEED_ADMIN_NAME`     | Nome do admin criado pelo seed.                                     |

Em producao, a validacao bloqueia `JWT_SECRET` fraco, `CORS_ORIGIN=*`, Swagger habilitado e ausencia de `JWT_ISSUER`/`JWT_AUDIENCE`.

## Banco de dados, migrations e seed

O schema Prisma esta em `prisma/schema.prisma` e usa PostgreSQL.

Para aplicar migrations em desenvolvimento:

```bash
npm run prisma:migrate
```

Para aplicar migrations em producao ou ambientes controlados:

```bash
npm run prisma:migrate:deploy
```

Para executar o seed:

```bash
npm run prisma:seed
```

O seed cria um usuario admin somente quando `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` e `SEED_ADMIN_NAME` estiverem definidos. Se o usuario ja existir, ele nao e recriado.

## Execucao local

Fluxo recomendado para subir a API localmente:

```bash
docker compose up -d postgres
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run start:dev
```

Por padrao, com `PORT=3000` e `API_PREFIX=api`, a API fica disponivel em:

```text
http://localhost:3000/api/v1
```

Healthcheck:

```text
GET http://localhost:3000/api/v1/health
```

## Execucao em desenvolvimento

Use o modo watch do NestJS:

```bash
npm run start:dev
```

Para depuracao:

```bash
npm run start:debug
```

## Execucao em producao

Build da aplicacao:

```bash
npm run build
```

Aplicacao das migrations:

```bash
npm run prisma:migrate:deploy
```

Inicializacao:

```bash
npm run start
```

Tambem e possivel subir API e PostgreSQL com Docker Compose:

```bash
docker compose up -d --build
```

O servico `api` do `docker-compose.yml` executa `prisma:generate`, `prisma:migrate:deploy` e `start`.

## Scripts disponiveis

| Script                          | Descricao                                                          |
| ------------------------------- | ------------------------------------------------------------------ |
| `npm run build`                 | Compila o projeto NestJS para `dist/`.                             |
| `npm run start`                 | Executa a aplicacao compilada com `node dist/main.js`.             |
| `npm run start:dev`             | Executa em modo desenvolvimento com watch.                         |
| `npm run start:debug`           | Executa em modo debug com watch.                                   |
| `npm run lint`                  | Roda ESLint em `src`, `test` e `prisma`.                           |
| `npm run format`                | Formata arquivos TypeScript, JSON, Markdown e YAML com Prettier.   |
| `npm run test`                  | Roda testes unitarios com Jest.                                    |
| `npm run test:watch`            | Roda testes em modo watch.                                         |
| `npm run test:cov`              | Roda testes com cobertura.                                         |
| `npm run test:e2e`              | Roda testes end-to-end com a configuracao de `test/jest-e2e.json`. |
| `npm run prisma:generate`       | Gera o Prisma Client.                                              |
| `npm run prisma:migrate`        | Aplica/cria migrations em desenvolvimento.                         |
| `npm run prisma:migrate:deploy` | Aplica migrations existentes em ambientes controlados/producao.    |
| `npm run prisma:seed`           | Executa o seed de admin.                                           |

## Testes

Testes unitarios:

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

## Documentacao da API

Quando `ENABLE_SWAGGER=true` e `NODE_ENV` nao e `production`, a documentacao fica disponivel em:

```text
http://localhost:3000/docs
```

A API usa Bearer Token JWT. No Swagger, use o botao de autorizacao para informar o token retornado por:

```text
POST /api/v1/auth/login
```

## Estrutura de pastas

```text
src/
  auth/                 Autenticacao, JWT, login e registro protegido
  budget-conversions/   Conversao de orcamento aprovado em ordem de servico
  budgets/              Orcamentos, itens, aprovacao e reprovação
  clients/              Cadastro e consulta de clientes
  common/               Decorators, guards, filtros, enums, DTOs e utilitarios
  config/               Configuracao e validacao de variaveis de ambiente
  dashboard/            Indicadores consolidados
  financial/            Lancamentos, pagamentos e resumo financeiro
  health/               Healthcheck da aplicacao
  inventory/            Itens de estoque, alertas e movimentacoes
  prisma/               PrismaService e modulo de acesso a dados
  service-catalog/      Catalogo de servicos
  service-orders/       Ordens de servico, status e pecas utilizadas
  users/                Usuarios e mecanicos
  vehicles/             Veiculos e historico
prisma/
  migrations/           Historico de migrations SQL
  schema.prisma         Modelagem do banco
  seed.ts               Seed opcional de admin
test/
  app.e2e-spec.ts       Teste end-to-end base
```

## Arquitetura e padroes adotados

- Aplicacao modular por dominio, seguindo os modulos do NestJS.
- Controllers focados em contrato HTTP, guards e documentacao Swagger.
- Services e use cases concentram regras de negocio.
- DTOs com `class-validator` e `class-transformer`.
- `ValidationPipe` global com `whitelist`, `forbidNonWhitelisted` e transformacao automatica.
- Prisma centralizado em `PrismaService`.
- Transacoes Prisma em fluxos sensiveis de orcamento, ordem de servico e estoque.
- Versionamento de API por URI com versao padrao `v1`.
- Prefixo global configuravel via `API_PREFIX`.
- Filtro global de excecoes HTTP para padronizar erros e registrar logs.

## Autenticacao e autorizacao

Rotas protegidas usam `JwtAuthGuard`. Rotas com controle por perfil usam tambem `RolesGuard`.

Fluxos principais:

- `POST /api/v1/auth/login`: autentica e retorna JWT.
- `POST /api/v1/auth/register`: cria usuario, restrito a `ADMIN`.
- `GET /api/v1/auth/me`: retorna o usuario autenticado.

Perfis existentes:

- `ADMIN`
- `ATENDENTE`
- `MECANICO`
- `FINANCEIRO`

## Seguranca e boas praticas

- Senhas armazenadas com bcrypt.
- JWT com segredo e expiracao configuraveis.
- `Helmet` habilitado.
- CORS restrito por variavel de ambiente.
- Rate limit global com `@nestjs/throttler`.
- Rate limit especifico no login.
- Logs HTTP com redaction de `Authorization`, senha e `set-cookie`.
- Stack trace nao e exposto em respostas de erro.
- Validacao de ambiente na inicializacao.
- Validacoes de seguranca adicionais para producao.
- Regras de integridade no Prisma e no banco para relacoes, unicidade e consistencia de dados.

## Observabilidade e healthcheck

Logs sao emitidos com `nestjs-pino`/Pino e nivel configuravel por `LOG_LEVEL`.

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

Erro de validacao de ambiente ao iniciar:

- Verifique se todas as variaveis obrigatorias existem no `.env`.
- Em producao, confirme `JWT_SECRET` com pelo menos 32 caracteres, `JWT_ISSUER`, `JWT_AUDIENCE` e `ENABLE_SWAGGER=false`.
- Verifique se `CORS_ORIGIN` nao contem `*` nem origens vazias.

Erro de conexao com banco:

- Confirme se o PostgreSQL esta rodando.
- Se usar Docker Compose, execute `docker compose up -d postgres`.
- Confira usuario, senha, host, porta e database em `DATABASE_URL`.

Erro relacionado ao Prisma Client:

- Execute `npm run prisma:generate`.
- Depois aplique as migrations com `npm run prisma:migrate` em desenvolvimento ou `npm run prisma:migrate:deploy` em producao.

Swagger nao abre:

- Confirme `ENABLE_SWAGGER=true`.
- Confirme que `NODE_ENV` nao esta como `production`.
- Acesse `http://localhost:3000/docs`, nao uma rota prefixada por `/api`.

## Observacoes importantes

- O backend nao deve ser executado em producao com Swagger habilitado.
- O `docker-compose.yml` define `DATABASE_URL` interno apontando para o servico `postgres`.
- O arquivo `.env` local nao deve ser versionado.
- Antes de abrir PRs ou publicar mudancas, rode ao menos `npm run lint` e `npm run test`.

## Melhorias futuras

- Versionar um `.env.example` sem segredos para facilitar onboarding.
- Adicionar documentacao de contratos externos, caso integracoes sejam ativadas.
- Expandir testes end-to-end para os principais fluxos de negocio.
- Documentar estrategia de deploy quando o ambiente de producao estiver definido.
