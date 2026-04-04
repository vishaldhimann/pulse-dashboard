# Pulse — Federated SaaS Analytics Platform

A drop-in analytics SDK + dashboard that tracks user behavior, page time, API performance, errors, and application journeys across isolated single-tenant instances — with AI-powered insights.

## What It Does

- **One script tag** — embed in any web app, zero code changes needed
- **Auto-tracks** — page views, time on page, route changes, API calls (with slug), clicks, errors, console errors
- **User context** — reads NgRx/Redux store to attach user ID, app ID, business name, loan details to every event
- **Real-time dashboard** — see events as they happen via Socket.io
- **Drill-down analytics** — User → Application Sections → Detailed Page Stats (time, idle, API calls, errors)
- **AI chatbot** — ask questions about your data, powered by Azure OpenAI

## Tech Stack

| Layer | Technology |
|-------|-----------|
| SDK | Vanilla JavaScript (framework-agnostic) |
| Backend | Node.js, Express, MongoDB (Mongoose), Socket.io |
| Frontend | Angular 20, Chart.js, Socket.io-client |
| AI | Azure OpenAI (GPT-4o) |
| Database | MongoDB / Azure Cosmos DB (MongoDB API) |

## Project Structure

```
pulse-project/
├── sdk/                    # Drop-in analytics SDK
│   └── dist/
│       └── pulse.min.js   # Single file — embed via script tag
├── backend/                # Express API server
│   ├── src/
│   │   ├── server.js       # Entry point, middleware, Socket.io
│   │   ├── models/         # MongoDB schemas (Event, Instance, Alert, LoanEvent)
│   │   ├── routes/
│   │   │   ├── events.js       # Event ingestion (POST /api/events/ingest)
│   │   │   ├── analytics.js    # Aggregation queries (summary, DAU, heatmap, etc.)
│   │   │   ├── instances.js    # Instance management
│   │   │   ├── alerts.js       # Churn detection
│   │   │   ├── observability.js # Error monitoring
│   │   │   ├── businessIntel.js # Lending-specific analytics
│   │   │   └── ai.js           # Azure OpenAI chat + insights
│   │   ├── seed.js         # Demo data generator
│   │   └── cleanup.js      # Data cleanup utility
│   ├── .env                # Configuration (MongoDB URI, Azure OpenAI keys)
│   └── package.json
└── frontend/               # Angular 20 dashboard
    ├── src/
    │   ├── app/
    │   │   ├── pages/
    │   │   │   ├── overview/         # KPI cards + charts
    │   │   │   ├── user-analytics/   # 3-level drill-down
    │   │   │   ├── route-analytics/  # Route time analysis
    │   │   │   ├── errors/           # Error monitoring
    │   │   │   └── realtime/         # Live event feed
    │   │   ├── services/
    │   │   │   ├── api.service.ts    # HTTP client for backend
    │   │   │   └── socket.service.ts # Socket.io client
    │   │   └── app.component.ts      # Layout + floating AI chatbot
    │   └── styles.scss               # Global theme
    └── package.json
```

## Setup & Run

### Prerequisites
- Node.js 20.19+
- MongoDB running locally (or Cosmos DB connection string)
- (Optional) Azure OpenAI resource for AI chatbot

### 1. Backend

```bash
cd pulse-project/backend
cp .env.example .env        # Edit with your MongoDB URI and Azure OpenAI keys
npm install
npm run seed                 # (Optional) Generate demo data
npm run dev                  # Starts on port 3200
```

Environment variables (`.env`):
```
PORT=3200
MONGODB_URI=mongodb://localhost:27017/pulse
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_KEY=your-key
AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini
```

### 2. Frontend (Dashboard)

```bash
cd pulse-project/frontend
npm install
npm start                    # Starts on port 4300
```

Open `http://localhost:4300` to see the dashboard.

### 3. Embed SDK in Any App

Add one script tag to your app's `index.html`:

```html
<script src="http://localhost:3200/pulse.min.js"
  data-api-key="ANY_KEY_HERE"
  data-endpoint="http://localhost:3200"
  data-debug="true">
</script>
```

That's it. The SDK auto-registers unknown API keys, so no manual setup needed.

For Angular apps with NgRx, add one line in `app.component.ts` to expose user/app context:
```typescript
this.store.subscribe((state: any) => (window as any).__pulse_context = state?.app);
```

## How It Works

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Any Web App     │     │  Pulse Backend   │     │  Pulse Dashboard│
│                  │     │  (Express)       │     │  (Angular)      │
│  <script> tag    │────▶│  /api/events     │────▶│  Charts, Tables │
│  pulse.min.js    │     │  /api/analytics  │     │  AI Chatbot     │
│                  │     │  /api/ai/chat    │     │  Real-time Feed │
│  Auto-captures:  │     │  MongoDB         │     │  Drill-down     │
│  • Page views    │     │  Socket.io       │     │                 │
│  • Time on page  │     │                  │     │                 │
│  • API calls     │     │                  │     │                 │
│  • Clicks        │     │                  │     │                 │
│  • Errors        │     │                  │     │                 │
│  • User context  │     │                  │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

## SDK Configuration

All config via `data-*` attributes on the script tag:

| Attribute | Default | Description |
|-----------|---------|-------------|
| `data-api-key` | (required) | Instance API key |
| `data-endpoint` | `http://localhost:3200` | Pulse backend URL |
| `data-debug` | `false` | Log events to console |
| `data-flush-interval` | `5000` | Ms between event flushes |

## SDK Public API

```javascript
// Manual tracking
Pulse.track('custom_event', 'interaction', { key: 'value' });

// Identify user (auto-hashed)
Pulse.identify('user@email.com');

// Set context from app state
Pulse.setContext({ userData: {...}, appID: '...', appData: {...} });

// Check if context is resolved
Pulse.isContextResolved();

// Get current context
Pulse.getContext();

// Force flush events
Pulse.flush();
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/events/ingest` | Batch event ingestion from SDK |
| GET | `/api/events` | Query events with filters |
| GET | `/api/analytics/summary` | Total events, users, errors |
| GET | `/api/analytics/dau` | Daily active users |
| GET | `/api/analytics/top-features` | Most used features |
| GET | `/api/analytics/event-type-breakdown` | Events by type |
| GET | `/api/analytics/page-time-summary` | Time per page per user |
| GET | `/api/analytics/heatmap` | Feature usage per instance |
| POST | `/api/ai/chat` | AI chatbot (Azure OpenAI) |
| POST | `/api/ai/insights` | Auto-generated insights |
| GET | `/api/instances` | List registered instances |
| GET | `/api/observability/errors` | Grouped errors |
| POST | `/api/alerts/detect-churn` | Run churn detection |

## Security

- **No PII in transit** — SDK hashes emails, phone numbers, PAN before sending
- **API key authentication** — each instance has a unique key
- **Auto-registration** — unknown keys auto-create instances (configurable)
- **GDPR-compliant** — user IDs are hashed, no raw personal data stored centrally
- **AI guardrails** — system prompt constrains AI responses, context only loaded for data questions

## Configurable Per Client

The SDK works with any web app. For Angular apps with NgRx:
- User context (name, email, session) is read from the store automatically
- Application journey steps are configurable per client
- Each client gets their own instance with isolated data

## What Events Are Tracked

| Event Type | Auto/Manual | Description |
|-----------|-------------|-------------|
| `pageview` | Auto | Page navigation detected |
| `page_time` | Auto | Duration on each page + activity count |
| `route_change` | Auto | From → To route transition |
| `api_call` | Auto | HTTP calls with slug, response time, status |
| `interaction` | Auto | Button/link clicks |
| `field_focus` | Auto | Form field interactions |
| `error` | Auto | JS errors, unhandled rejections |
| `console_error` | Auto | console.error() calls |
| `session_start` | Auto | Session begins |
| `session_end` | Auto | Session ends (page unload) |
