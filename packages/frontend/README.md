# WhatsApp CRM

A full-stack WhatsApp lead capture CRM. The bot collects leads via WhatsApp and stores them in a SQLite database. The React dashboard lets the sales team search, filter, and update leads.

## Prerequisites

- Node.js v18+
- ngrok
- Meta Developer account with a WhatsApp Cloud API app

## Setup

### 1. Clone the repo
```bash
git clone https://github.com/shanilamalesa/Whatsapp-cloud-assignment.git
cd Whatsapp-cloud-assignment
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
```bash
cd packages/backend
cp .env.example .env
```
Fill in your Meta credentials in `.env`:
- `META_PHONE_NUMBER_ID`
- `META_ACCESS_TOKEN`
- `META_VERIFY_TOKEN`
- `META_APP_SECRET`

### 4. Run the project
```bash
cd ../..
npm run dev
```

### 5. Expose backend with ngrok
```bash
ngrok http 3001
```
Paste the ngrok URL into Meta dashboard as your webhook callback URL.

## Architecture

WhatsApp User
↓
Meta Cloud API
↓
Express Backend (port 3001)
↓
SQLite Database (leads, conversations, messages)
↑
React Dashboard (port 3000)

## Common Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both backend and frontend |
| `npm run dev:backend` | Start backend only |
| `npm run dev:frontend` | Start frontend only |

## Troubleshooting

- **Webhook verification fails** — check `META_VERIFY_TOKEN` in `.env` matches Meta dashboard
- **Bot not replying** — check `META_ACCESS_TOKEN` and `META_PHONE_NUMBER_ID` in `.env`
- **Dashboard shows "Failed to load leads"** — make sure backend is running on port 3001
- **ngrok URL expired** — free ngrok URLs change on restart, update Meta dashboard each time
- **Database not found** — run backend once to auto-create `leads.db`