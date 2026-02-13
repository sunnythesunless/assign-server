<div align="center">

# ⚡ InvoiceFlow — Server

**Production-Ready Invoice API built with Express + TypeScript + Prisma ORM**

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.21-000000?logo=express&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?logo=prisma&logoColor=white)

</div>

---

## ✨ Features

- 📋 **Full Invoice CRUD** — Get invoice details with line items, payments, and computed totals
- 💳 **Payment Processing** — Record payments with business rules (no overpayment, auto-status update)
- 📦 **Archive / Restore** — Soft-archive and restore invoices
- 📄 **PDF Generation** — Server-side professional invoice PDFs via `pdfkit`
- 🔐 **JWT Authentication** — Register, login, and protected routes with `bcryptjs`
- 💱 **Multi-Currency** — USD, EUR, GBP, INR formatting with `Intl.NumberFormat`
- ⏰ **Overdue Detection** — Automatic overdue status based on due date
- 🧮 **Tax Calculation** — Configurable tax rate per invoice
- 🛡️ **Production Security** — Helmet, CORS, rate limiting (100 req/15min)
- ✅ **Input Validation** — Zod schemas on every endpoint
- 🔄 **Atomic Transactions** — Prisma `$transaction` for payment operations
- 📝 **Request Logging** — Morgan HTTP logger
- 🏥 **Health Check** — `GET /api/health` endpoint
- 🛑 **Graceful Shutdown** — Proper SIGTERM/SIGINT handling

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18+

### Install & Run

```bash
git clone https://github.com/sunnythesunless/assign-server.git
cd assign-server

# Setup environment
cp .env.example .env

# Install & initialize database
npm install
npx prisma migrate dev --name init
npx prisma db seed

# Start server
npm run dev
```

Server starts at **http://localhost:3001**

### Demo User (seeded automatically)
```
Email:    demo@invoice.app
Password: password123
```

### Sample Data
The seed script creates **5 invoices** with different statuses, currencies, and payment states:

| Invoice | Customer | Status | Currency |
|---------|----------|--------|----------|
| INV-20260101-0001 | Acme Corp | DRAFT | USD |
| INV-20260115-0002 | TechStart Inc | DRAFT | USD |
| INV-20260201-0003 | Global Traders | PAID | EUR |
| INV-20260210-0004 | Design Studio | OVERDUE | GBP |
| INV-20260212-0005 | CloudNet Solutions | DRAFT | INR |

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Create new user |
| `POST` | `/api/auth/login` | Login, returns JWT |
| `GET` | `/api/auth/me` | Get current user (requires auth) |
| `GET` | `/api/invoices` | List invoices (paginated, filterable) |
| `GET` | `/api/invoices/:id` | Invoice + line items + payments + totals |
| `POST` | `/api/invoices/:id/payments` | Record payment (validates amount) |
| `POST` | `/api/invoices/:id/archive` | Archive invoice |
| `POST` | `/api/invoices/:id/restore` | Restore archived invoice |
| `GET` | `/api/invoices/:id/pdf` | Download invoice as PDF |
| `GET` | `/api/health` | Server health check |

---

## 🗄️ Database Schema

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
│     User     │     │    InvoiceLine   │     │   Payment    │
├──────────────┤     ├──────────────────┤     ├──────────────┤
│ id           │     │ id               │     │ id           │
│ email        │     │ invoiceId (FK)   │     │ invoiceId(FK)│
│ password     │     │ description      │     │ amount       │
│ name         │     │ quantity         │     │ paymentDate  │
│ createdAt    │     │ unitPrice        │     │ note         │
└──────┬───────┘     │ lineTotal        │     │ createdAt    │
       │             └────────┬─────────┘     └──────┬───────┘
       │                      │                      │
       │ 1:N          N:1     │               N:1    │
       │             ┌────────┴──────────────────────┴───┐
       └─────────────┤            Invoice                │
                     ├───────────────────────────────────┤
                     │ id, invoiceNumber, customerName   │
                     │ issueDate, dueDate, status        │
                     │ total, amountPaid, balanceDue     │
                     │ currency, taxRate, taxAmount      │
                     │ isArchived, userId (FK)           │
                     └───────────────────────────────────┘
```

---

## 🏗️ Tech Stack

| Technology | Purpose |
|-----------|---------|
| **Node.js + Express** | HTTP server & routing |
| **TypeScript** | Type safety |
| **Prisma ORM** | Database access & migrations |
| **SQLite** | Zero-config database (portable to PostgreSQL) |
| **bcryptjs** | Password hashing |
| **jsonwebtoken** | JWT auth tokens |
| **pdfkit** | Server-side PDF generation |
| **Zod** | Runtime input validation |
| **Helmet** | Security headers |
| **Morgan** | HTTP request logging |
| **express-rate-limit** | API rate limiting |

---

## 📁 Project Structure

```
├── prisma/
│   ├── schema.prisma          # Database models & relations
│   └── seed.ts                # Sample data seeder
├── src/
│   ├── index.ts               # Express app entry point
│   ├── config/
│   │   ├── index.ts           # Zod-validated environment config
│   │   └── database.ts        # Prisma singleton client
│   ├── middleware/
│   │   ├── auth.middleware.ts  # JWT authentication
│   │   └── error.middleware.ts # Global error handler
│   ├── modules/
│   │   ├── auth/
│   │   │   └── auth.routes.ts # Register, login, me
│   │   └── invoice/
│   │       └── invoice.routes.ts # All invoice endpoints
│   └── utils/
│       ├── errors.ts          # Custom error classes
│       ├── currency.ts        # Multi-currency formatting
│       └── pdf.ts             # Invoice PDF generation
├── .env.example               # Environment template
├── package.json
└── tsconfig.json
```

---

## ⚙️ Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `file:./dev.db` | SQLite database path |
| `JWT_SECRET` | — | Secret key for JWT signing |
| `PORT` | `3001` | Server port |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed frontend origin |
| `NODE_ENV` | `development` | Environment mode |

---

## 🔒 Business Rules

- **No Overpayment** — Payment amount must be ≤ balance due
- **Auto Status** — Invoice automatically set to `PAID` when balance = 0
- **Overdue Detection** — Invoices past due date flagged as `OVERDUE`
- **Atomic Payments** — Payment + invoice update wrapped in `$transaction`
- **Computed Totals** — `lineTotal`, `taxAmount`, `total`, `balanceDue` calculated server-side

---

## 🔗 Related

- **Frontend Client:** [assign-client](https://github.com/sunnythesunless/assign-client)

---

## 📜 License

MIT
