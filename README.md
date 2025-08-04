# GameDay Men's Health - Invoice Management System

A comprehensive invoice management system for healthcare providers, built with Next.js 15 and Supabase. This application provides intelligent invoice synchronization from MX Merchant API with nurse workflow tracking and professional export capabilities.

## 🚀 Features

- **Real-time Invoice Dashboard** - Compact interface for efficient invoice management
- **Nurse Workflow Tracking** - Yes/No status tracking for patient data management
- **Intelligent Sync** - Smart synchronization that preserves nurse workflow data
- **Advanced Filtering** - Search, status, date range, and workflow filtering
- **Individual Invoice Pages** - Detailed invoice view with product information
- **Responsive Design** - Optimized for desktop and mobile healthcare admin use

## 🛠️ Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **API Integration**: MX Merchant REST API
- **Deployment**: Vercel

## 📋 Prerequisites

- Node.js 18+ and npm/yarn
- Supabase project with PostgreSQL database
- MX Merchant API credentials (Consumer Key & Secret)
- Vercel account for deployment

## 🔧 Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd automation
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   ```
   Fill in your credentials in `.env.local`

4. **Set up the database:**
   - Create a new Supabase project
   - Run the SQL script from `supabase_complete_setup.sql` in your Supabase SQL editor
   - Configure your environment variables with Supabase credentials

5. **Run the development server:**
   ```bash
   npm run dev
   ```

6. **Initialize the database:**
   - Visit `http://localhost:3000/setup`
   - Click "Setup Database" to test connections
   - Click "Start Invoice Sync" to sync your invoices

## 🌍 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL` | Your Supabase project URL | ✅ |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | ✅ |
| `MX_MERCHANT_CONSUMER_KEY` | MX Merchant API consumer key | ✅ |
| `MX_MERCHANT_CONSUMER_SECRET` | MX Merchant API consumer secret | ✅ |
| `MX_MERCHANT_ENVIRONMENT` | API environment (production/sandbox) | ✅ |
| `NEXT_PUBLIC_APP_URL` | Your app URL for internal links | ✅ |

## 🚀 Deployment to Vercel

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Deploy to Vercel:**
   - Connect your GitHub repository to Vercel
   - Configure environment variables in Vercel dashboard
   - Deploy automatically

3. **Post-deployment setup:**
   - Visit `https://your-app.vercel.app/setup`
   - Run database setup and initial sync
   - Test all functionality

## 📁 Project Structure

```
src/
├── app/
│   ├── dashboard/              # Main dashboard and invoice pages
│   │   ├── invoices/[id]/      # Individual invoice detail pages
│   │   └── page.tsx            # Dashboard with sync and export
│   ├── setup/                  # Database setup and initial sync
│   └── api/                    # API routes
│       ├── invoices/           # Invoice CRUD operations
│       ├── sync/               # Intelligent sync functionality
│       └── webhooks/           # MX Merchant webhooks
├── components/
│   ├── invoice/                # Invoice table and filters
│   ├── sync/                   # Sync dialog
│   └── ui/                     # shadcn/ui components
├── lib/
│   ├── supabase.ts            # Database client
│   ├── dal.ts                 # Data access layer
│   ├── mx-merchant-client.ts  # MX Merchant API client
│   └── utils.ts               # Utility functions
└── types/
    └── invoice.ts             # TypeScript types
```

## 🏥 Core Features

### Invoice Management
- **Dashboard**: Real-time invoice display with statistics
- **Filtering**: Search, status, date range, and workflow filters
- **Pagination**: Server-side pagination for large datasets
- **Nurse Workflow**: Yes/No status tracking for patient data

### Intelligent Sync
- **Smart Comparison**: Detects new, updated, and unchanged invoices
- **Data Preservation**: Preserves nurse workflow data during sync
- **Progress Tracking**: Real-time sync progress with detailed statistics
- **Error Handling**: Comprehensive error tracking and recovery

### Professional Exports
### Individual Invoice Pages
- **Detailed View**: Complete invoice information with products
- **GameDay Styling**: Professional healthcare-focused design
- **Workflow Interface**: Nurse status update capabilities
- **Product Details**: MX Merchant product information

## 🔒 Security

- **Environment Variables**: All sensitive data stored in environment variables
- **Row Level Security**: Database-level access control
- **API Authentication**: Secure MX Merchant API integration
- **Data Validation**: Comprehensive input validation and sanitization

## 📊 Database Schema

The application uses a comprehensive PostgreSQL schema with:

- **Users**: User management and authentication
- **Invoices**: Complete invoice data with workflow tracking
- **Invoice Items**: Product details and pricing
- **Sync Logs**: API synchronization tracking
- **Export Logs**: Export operation logging
- **MX Merchant Configs**: API configuration management

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

This project is proprietary software for GameDay Men's Health.

## 🆘 Support

For support and questions:
- Check the setup page for common issues
- Review the CLAUDE.md file for technical details
- Contact the development team for additional assistance

## 🏆 Production Ready

This application is production-ready with:
- ✅ Complete healthcare invoice management
- ✅ Nurse workflow tracking with data preservation
- ✅ Professional export system
- ✅ Intelligent sync with error handling
- ✅ Enterprise-level database security
- ✅ Responsive design for all devices
- ✅ Real-time updates and statistics

**Ready for immediate deployment to Vercel!** 🚀