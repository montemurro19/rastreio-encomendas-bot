# 📦 Telegram Package Tracker

Serviço de rastreamento de encomendas integrado ao Telegram com NestJS, PostgreSQL, Redis e BullMQ. Permite aos usuários cadastrar encomendas e receber notificações automáticas no Telegram sempre que houver uma nova movimentação ou entrega.

---

## 🚀 Stack

- **Backend:** Node.js (v22/24), TypeScript, [NestJS](https://nestjs.com/)
- **Database:** PostgreSQL com [TypeORM](https://typeorm.io/)
- **Queue & Background Jobs:** Redis com [BullMQ](https://bullmq.io/)
- **Bot:** Telegram Bot API via [Telegraf](https://telegrafjs.org/)
- **Infra:** Docker e Docker Compose

---

## 🏛️ Arquitetura

```text
                    ┌─────────────────┐
                    │    Telegram     │
                    │      Bot        │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │   Bot Module    │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  Package Module │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
         PostgreSQL       Redis/BullMQ    Providers
                                           │
                              ┌────────────┼───────────┐
                              ▼            ▼           ▼
                          Correios    Melhor Envio   Mock/Outros
```

### Separação API / Worker

- **API (`src/main.ts`):** Responsável por comandos do Telegram, webhook/polling do bot, API REST, cadastro de encomendas e consulta inicial.
- **Worker (`src/worker.ts`):** Responsável pelo processamento em segundo plano via filas BullMQ (`tracking-queue`), varredura periódica de encomendas ativas, consultas às transportadoras com backoff exponencial e disparo de notificações.

---

## 📂 Estrutura do Projeto

```text
src/
├── app.controller.ts
├── app.module.ts
├── app.service.ts
│
├── config/
│   ├── app.config.ts
│   ├── database.config.ts
│   ├── telegram.config.ts
│   └── tracking.config.ts
│
├── modules/
│   ├── users/
│   │   ├── entities/user.entity.ts
│   │   ├── repositories/users.repository.ts
│   │   ├── services/users.service.ts
│   │   └── users.module.ts
│   │
│   ├── packages/
│   │   ├── controllers/packages.controller.ts
│   │   ├── dto/
│   │   ├── entities/
│   │   │   ├── package.entity.ts
│   │   │   └── tracking-event.entity.ts
│   │   ├── repositories/
│   │   │   ├── packages.repository.ts
│   │   │   └── tracking-events.repository.ts
│   │   ├── services/packages.service.ts
│   │   └── packages.module.ts
│   │
│   ├── tracking/
│   │   ├── jobs/
│   │   │   ├── tracking.processor.ts
│   │   │   └── tracking.scheduler.ts
│   │   ├── providers/
│   │   │   ├── tracking-provider.interface.ts
│   │   │   ├── correios-tracking.provider.ts
│   │   │   ├── melhor-envio-tracking.provider.ts
│   │   │   ├── mock-tracking.provider.ts
│   │   │   └── tracking-provider.registry.ts
│   │   ├── services/tracking.service.ts
│   │   └── tracking.module.ts
│   │
│   ├── notifications/
│   │   ├── services/
│   │   │   ├── notification-provider.interface.ts
│   │   │   └── notifications.service.ts
│   │   ├── telegram/telegram-notification.provider.ts
│   │   └── notifications.module.ts
│   │
│   └── bot/
│       ├── conversations/
│       │   ├── conversation.types.ts
│       │   └── conversation.service.ts
│       ├── handlers/
│       │   ├── commands.handler.ts
│       │   └── actions.handler.ts
│       ├── keyboards/bot.keyboards.ts
│       ├── bot.service.ts
│       └── bot.module.ts
│
├── shared/
│   ├── enums/package-status.enum.ts
│   ├── errors/custom.errors.ts
│   ├── types/tracking.types.ts
│   └── utils/
│       ├── hash.util.ts
│       └── tracking-code.util.ts
│
├── main.ts
└── worker.ts
```

---

## 🤖 Comandos do Bot no Telegram

| Comando | Descrição |
|---|---|
| `/start` | Registra/recupera o usuário e abre o menu interativo com botões |
| `/rastrear` | Inicia o fluxo conversacional para cadastrar uma nova encomenda |
| `/encomendas` | Lista todas as encomendas do usuário com status e botões de ação |
| `/atualizar` | Executa a atualização manual de status das encomendas |
| `/configuracoes` | Permite ativar ou desativar as notificações gerais |
| `/cancelar` | Cancela qualquer operação conversacional em andamento |
| `/ajuda` | Exibe a lista de comandos e ajuda |

### Botões Interativos (Inline Keyboards)

- **Menu Principal:** Adicionar encomenda, Minhas encomendas, Atualizar todas, Notificações.
- **Detalhes da Encomenda:**
  - `[🔄 Atualizar]` - Consulta a transportadora imediatamente.
  - `[📋 Histórico]` - Exibe todo o histórico de eventos da encomenda.
  - `[⏸️ Pausar]` / `[▶️ Retomar]` - Alterna o status de monitoramento automático.
  - `[🗑️ Remover]` - Solicita confirmação e remove a encomenda.

---

## 🔒 Idempotência e Regras de Negócio

1. **Hash Determinístico de Eventos (SHA-256):**
   ```text
   eventHash = sha256(trackingCode + status + description + location + eventDate)
   ```
   Garante que o mesmo evento nunca seja salvo nem notificado mais de uma vez. Uma constraint única `(package_id, event_hash)` no banco assegura idempotência a nível de banco de dados.

2. **Primeira Consulta (Cadastro):**
   A consulta inicial executada no cadastro salva o histórico existente mas **não** dispara notificações de eventos passados. Somente novos eventos identificados em consultas futuras geram alertas.

3. **Notificação de Entrega:**
   Quando a encomenda atinge o status `DELIVERED`, o bot envia uma notificação especial de entrega e desativa o rastreamento automático (`trackingEnabled = false`).

4. **Isolamento e Segurança:**
   Cada usuário do Telegram só pode visualizar, pausar, atualizar ou remover suas próprias encomendas (`package.userId === authenticatedUser.id`).

---

## ⚙️ Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env`:

```bash
cp .env.example .env
```

| Variável | Padrão | Descrição |
|---|---|---|
| `NODE_ENV` | `development` | Ambiente (`development` ou `production`) |
| `PORT` | `3000` | Porta HTTP da API |
| `DATABASE_URL` | `postgresql://...` | String de conexão com o PostgreSQL |
| `REDIS_URL` | `redis://localhost:6379` | String de conexão com o Redis |
| `TELEGRAM_BOT_TOKEN` | - | Token do bot fornecido pelo [@BotFather](https://t.me/BotFather) |
| `TRACKING_INTERVAL_MINUTES` | `15` | Intervalo em minutos entre consultas automáticas |
| `TRACKING_JOB_ATTEMPTS` | `3` | Tentativas de retry com backoff exponencial |

---

## 🐳 Executando com Docker Compose

Para subir toda a infraestrutura (PostgreSQL, Redis, API e Worker):

```bash
# Iniciar todos os serviços em background
docker compose up -d --build

# Acompanhar os logs
docker compose logs -f

# Acompanhar apenas logs da API ou do Worker
docker compose logs -f api
docker compose logs -f worker
```

---

## 💻 Executando Localmente

### 1. Instalar dependências
```bash
pnpm install
```

### 2. Iniciar API (Telegram Bot + HTTP)
```bash
pnpm run start:dev
```

### 3. Iniciar Worker de Rastreamento (Background jobs)
```bash
pnpm run worker:dev
```

### 4. Executar Testes
```bash
# Testes unitários
pnpm run test

# Testes com cobertura
pnpm run test:cov
```
