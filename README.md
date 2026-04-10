# Bar Restaurant App

## Overview
This is a web application designed for managing a bar or restaurant. It allows admins to manage products, staff to handle orders, and cooks to update order statuses in real-time.

## Features
- **Admin Dashboard**: Manage products, prices, and admin users.
- **Real-time Order Management**: Staff can receive and manage orders live.
- **Kitchen Interface**: Cooks can update the status of orders.
- **Hold Timer**: Staff can put orders on hold for a specified time.
- **CSV Export**: Admins can export order data for reporting.

## Project Structure
```
bar-restaurant-app
├── src
│   ├── app
│   ├── components
│   ├── lib
│   ├── hooks
│   ├── styles
│   └── types
├── pages
│   └── api
├── prisma
├── scripts
├── public
├── .env.example
├── package.json
├── tsconfig.json
├── next.config.js
└── vercel.json
```

## Getting Started

### Prerequisites
- Node.js
- npm or yarn
- A Vercel account for deployment

### Installation
1. Clone the repository:
   ```
   git clone <repository-url>
   cd bar-restaurant-app
   ```
2. Install dependencies:
   ```
   npm install
   ```
   or
   ```
   yarn install
   ```

3. Configure the database connection:
   - Create a Supabase project.
   - Open `Project Settings > Database` in Supabase.
   - Copy the pooled connection string into `DATABASE_URL`.
   - Copy the direct connection string into `DIRECT_URL`.
   - Use `.env.example` as the base for your local `.env`.

4. Push the Prisma schema:
   ```
   npx prisma db push
   ```

5. Optional: seed the database:
   ```
   npx tsx scripts/seed.ts
   ```

### Running the Application
To start the development server, run:
```
npm run dev
```
or
```
yarn dev
```
Visit `http://localhost:3000` in your browser.

## Supabase Database

This project uses Prisma with Supabase Postgres. You do not need to install the Supabase JavaScript client unless you also want Supabase Auth, Realtime, or Storage.

Required environment variables:

```env
AUTH_SECRET="replace-with-a-long-random-secret"
ADMIN_PASSWORD="temporary-password-used-only-to-migrate-legacy-admins-without-passwordHash"
SUPERADMIN_EMAIL="owner@example.com"
SUPERADMIN_PASSWORD="replace-with-a-strong-password"
DATABASE_URL="postgresql://postgres.<project-ref>:<password>@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres"
```

- `AUTH_SECRET`: signs admin and superadmin session cookies.
- `ADMIN_PASSWORD`: one-time migration password for legacy restaurant admins that still have `passwordHash = null`; on first successful login the hash is stored in the database.
- `SUPERADMIN_EMAIL` and `SUPERADMIN_PASSWORD`: credentials for `/superadmin`.
- `DATABASE_URL`: pooled connection used by the deployed app.
- `DIRECT_URL`: direct connection used by Prisma schema operations.

On Vercel, add both variables in the project environment settings before deploying.

### Deployment
To deploy the application on Vercel:
1. Push your code to a Git repository.
2. Connect your repository to Vercel.
3. Follow the prompts to deploy your application.

## License
This project is licensed under the MIT License.