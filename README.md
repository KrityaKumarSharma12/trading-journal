# 📈 Trading Journal

A TradeZella-style trading journal and portfolio analytics platform. Track trades, compute realized and unrealized P&L, analyze performance by strategy, visualize an equity curve, and drill into daily P&L with a calendar.

## ✨ Features

- 🔐 **JWT authentication** with httpOnly cookies
- 📝 **Trade CRUD** — buy/sell transactions with entry, exit, fees, stop-loss, take-profit
- 💰 **P&L engine** — realized P&L, R-multiple, risk/reward per trade
- 🎯 **Strategy system** — define setups, tag trades, per-strategy analytics
- 📊 **Analytics dashboard** — win rate, profit factor, expectancy, max drawdown
- 📈 **Equity curve** — cumulative P&L over time
- 📅 **P&L calendar** — daily green/red heatmap with trade drilldown
- 🔍 **Advanced filters** — symbol, side, status, tag, date range, P&L range
- 📓 **Trading journal** *(coming soon)*
- 📥 **CSV import** *(coming soon)*
- 🛠️ **Admin dashboard** *(coming soon)*

## 🧱 Tech Stack

**Backend**
- Node.js + TypeScript
- Express
- Prisma ORM
- PostgreSQL
- JWT + bcryptjs
- Zod validation

**Frontend**
- Next.js 16 (App Router)
- React 19
- Tailwind CSS v4
- Recharts
- Lucide icons
- Axios

## 📁 Project Structure

```
trading-journal/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma
│   └── src/
│       ├── lib/           # Prisma client singleton
│       ├── middleware/    # auth, admin guards
│       ├── routes/        # auth, trades, analytics, strategies
│       ├── services/      # P&L engine, calculations
│       └── server.ts
└── frontend/
    ├── app/
    │   ├── (auth)/        # login, register
    │   └── (dashboard)/   # dashboard, trades, strategies, calendar
    ├── components/
    └── lib/               # api client, auth context
```

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 14+
- npm

### 1. Clone

```bash
git clone https://github.com/KrityaKumarSharma12/trading-journal.git
cd trading-journal
```

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your PostgreSQL credentials
npx prisma generate
npx prisma db push
npm run dev
```

Backend runs on **http://localhost:4000**

### 3. Frontend Setup

```bash
cd ../frontend
npm install
cp .env.example .env.local
npm run dev
```

Frontend runs on **http://localhost:3000**

### 4. Create Your First Account

Visit http://localhost:3000/register and sign up.

## 📊 Core Calculations

| Metric | Formula |
|---|---|
| **Realized P&L** | `(exit − entry) × qty × direction − fees` |
| **Unrealized P&L** | `(currentPrice − entry) × openQty × direction` |
| **R-Multiple** | `(exit − entry) / (entry − stopLoss)` (direction aware) |
| **Win Rate** | `winningTrades / totalTrades × 100` |
| **Profit Factor** | `grossProfit / grossLoss` |
| **Max Drawdown** | `max(peak − trough) / peak` |
| **Expectancy** | `totalPnl / totalTrades` |

## 📸 Screenshots

*(Add screenshots here once you take them — dashboard, calendar, trades)*

## 🗺️ Roadmap

- [x] Auth + JWT
- [x] Trade CRUD
- [x] P&L engine
- [x] Analytics dashboard
- [x] Strategy system
- [x] P&L calendar
- [ ] Trading journal with rich editor
- [ ] CSV import with column mapper
- [ ] Trade detail page with edit/delete
- [ ] Admin dashboard
- [ ] Broker API integrations (Alpaca, IBKR)

## 📄 License

MIT