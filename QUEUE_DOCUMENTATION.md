# Filas e mensageria

Este backend usa Redis + BullMQ para executar integrações externas fora do fluxo principal da API.

## Contratos

Fila inicial:

```text
notifications.whatsapp
```

Job inicial:

```text
service-order.status-changed
```

Payload:

```ts
interface ServiceOrderStatusChangedWhatsAppJob {
  eventId: string;
  workshopId: string | null;
  serviceOrderId: string;
  previousStatus: ServiceOrderStatus;
  currentStatus: ServiceOrderStatus;
  occurredAt: string;
}
```

Regras do payload:

- Carregar apenas identificadores e metadados mínimos.
- Não carregar telefone, token, template renderizado, cliente completo ou dados sensíveis.
- Preservar `workshopId` quando o modelo multi-tenant estiver disponível.
- Enquanto o schema não possui `workshopId`, jobs gerados pela aplicação usam `workshopId: null`.
- Se um job chegar com `workshopId` e a OS carregada não tiver escopo persistido compatível, o worker não envia a mensagem.

## Fluxo de status da ordem de serviço

1. A API valida a transição de status.
2. A API persiste a mudança e efeitos internos em transação.
3. Após o commit, a API publica um job em `notifications.whatsapp`.
4. A resposta HTTP não depende da API do WhatsApp.
5. O worker consome o job, busca dados atuais da OS e cliente no banco, valida integração e envia a mensagem.
6. Falhas transitórias lançam erro para o BullMQ aplicar retry.
7. Falhas não transitórias são registradas no resultado do job e não são reprocessadas automaticamente.

## Retry

Padrão para jobs de WhatsApp:

- `attempts`: `QUEUE_WHATSAPP_ATTEMPTS` ou `5`.
- `backoff`: exponencial com `QUEUE_WHATSAPP_BACKOFF_DELAY_MS` ou `5000`.
- jobs completos são retidos por até 24 horas ou 1000 registros.
- jobs falhos são retidos por até 7 dias ou 5000 registros.

Erros retryable:

- falha de rede/timeout representada por `REQUEST_FAILED`;
- HTTP `408`, `409`, `425`, `429`;
- HTTP `5xx`.

Erros non-retryable:

- OS não encontrada;
- cliente sem telefone;
- telefone inválido;
- template ausente;
- integração WhatsApp inativa;
- divergência ou ausência de escopo tenant quando o job exige `workshopId`.

## Preparação para Outbox

O contrato já usa `eventId`. Em uma próxima etapa, esse campo pode passar a ser o id de uma tabela de outbox persistida na mesma transação da mudança de status. O producer atual é o único ponto que chama BullMQ, então a troca para outbox não exige espalhar lógica de fila pelos use cases.
