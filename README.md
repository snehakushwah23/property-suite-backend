# PropertySuite Backend API

## SOMANING KOLI - Samarth Developers Pro Pvt. Ltd.
### Property Management System Backend

---

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ 
- npm

### Installation
```bash
cd property-suite-backend
npm install
```

### Start Server
```bash
npm start
# or
node server.js
```

The server will start on `http://localhost:5000`

---

## 🔐 Default Admin Account

- **Username:** `admin`
- **Password:** `admin@123`
- **Role:** Admin
- **Name:** Somaning Pirappa Koli
- **Mobile:** 8421203314

---

## 📡 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user

### Dashboard
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET /api/dashboard/revenue` - Revenue analytics
- `GET /api/dashboard/agents` - Agent performance

### Plot Management
- `GET /api/plots` - Get all plots
- `POST /api/plots` - Create new plot
- `GET /api/plots/:id` - Get plot by ID
- `PUT /api/plots/:id` - Update plot
- `DELETE /api/plots/:id` - Delete plot
- `POST /api/plots/:id/memo` - Generate PDF memo

### Agents
- `GET /api/agents` - Get all agents
- `POST /api/agents` - Create new agent
- `PUT /api/agents/:id` - Update agent
- `DELETE /api/agents/:id` - Delete agent

### GST Bills
- `GET /api/gst` - Get all GST bills
- `POST /api/gst` - Create new GST bill
- `PUT /api/gst/:id` - Update GST bill

### Reminders
- `GET /api/reminders` - Get all reminders
- `POST /api/reminders` - Create new reminder
- `PUT /api/reminders/:id` - Update reminder

### Messages
- `GET /api/messages` - Get all messages
- `POST /api/messages` - Create new message
- `POST /api/messages/:id/send` - Send message

### Reports
- `GET /api/reports/sales` - Sales reports
- `GET /api/reports/agent-commission` - Agent commission reports
- `GET /api/reports/profit-loss` - Profit/Loss reports

### Users (Admin only)
- `GET /api/users` - Get all users
- `POST /api/users` - Create new user
- `PUT /api/users/:id/status` - Update user status

---

## 🗄️ Database Schema

### Tables
- **users** - System users (Admin, Accountant, Agent)
- **plots** - Plot/property information
- **agents** - Agent details and commission info
- **agent_plots** - Agent-plot relationships
- **gst_bills** - GST billing information
- **reminders** - Customer reminders
- **messages** - Bulk messaging system

---

## 📁 File Structure

```
property-suite-backend/
├── server.js              # Main server file
├── package.json           # Dependencies
├── database/
│   ├── init.js            # Database initialization
│   └── property_suite.db  # SQLite database
├── routes/
│   ├── auth.js           # Authentication routes
│   ├── dashboard.js      # Dashboard routes
│   ├── plots.js          # Plot management routes
│   ├── agents.js         # Agent management routes
│   ├── gst.js           # GST billing routes
│   ├── reminders.js     # Reminders routes
│   ├── messages.js      # Messaging routes
│   ├── reports.js       # Reports routes
│   └── users.js         # User management routes
├── middleware/
│   └── auth.js          # Authentication middleware
├── uploads/             # File uploads directory
└── pdfs/               # Generated PDF memos
```

---

## 🔒 Security Features

- JWT Authentication
- Password hashing with bcryptjs
- Rate limiting
- CORS protection
- Helmet security headers
- Input validation
- File upload restrictions

---

## 📄 PDF Generation

The system generates bilingual (English/Marathi) PDF memos for:
- Plot purchase transactions
- Plot sale transactions
- Agent commission slips

Features:
- Company branding
- Digital signatures
- Photo attachments
- Profit/loss calculations

---

## 🌐 Environment Variables

Create `.env` file:
```
NODE_ENV=development
PORT=5000
JWT_SECRET=your-super-secret-jwt-key
COMPANY_NAME=SOMANING KOLI
```

---

## 🧪 Testing

Health check: `http://localhost:5000/api/health`

Test all endpoints:
```bash
node test-api.js
```

---

## 📝 Notes

- Database is automatically initialized on first run
- File uploads are stored in `/uploads` directory
- Generated PDFs are stored in `/pdfs` directory
- All dates are in ISO format
- Currency amounts are in INR (Indian Rupees)

---

## 🆘 Support

For technical support contact: **8421203314**

**Company:** SOMANING KOLI – Samarth Developers Pro Pvt. Ltd.