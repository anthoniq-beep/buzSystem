# Backend Project Setup

This is the backend service for the BuzSystem CRM, powered by Node.js and Prisma (connecting to Supabase/PostgreSQL).

## Prerequisites

- Node.js installed
- A Supabase project created (or any PostgreSQL database)

## Setup Steps

1.  **Install Dependencies**
    ```bash
    npm install
    ```

2.  **Configure Database Connection**
    - Copy `.env.example` (or use the existing `.env`)
    - Update `DATABASE_URL` with your Supabase connection string.
    - You can find this in Supabase Dashboard -> Project Settings -> Database -> Connection string -> URI (Select "Transaction mode" if using serverless functions, or "Session mode" for long-running servers. For Prisma `db push`, Session mode is preferred).

    Example:
    ```env
    DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"
    ```

3.  **Push Schema to Database**
    This will create the tables in your Supabase database based on `prisma/schema.prisma`.
    ```bash
    npx prisma db push
    ```

4.  **Generate Prisma Client**
    ```bash
    npx prisma generate
    ```

5.  **View Database (Optional)**
    You can use Prisma Studio to view and edit data locally:
    ```bash
    npx prisma studio
    ```

## Database Schema

- **User**: Employees/Users with role management.
- **Department**: Organizational structure.
- **Customer**: Customer data with status and sales process tracking.
- **Channel**: Marketing channels and costs.
- **SaleLog**: Interaction history with customers.
- **SalesTarget**: Monthly sales targets per user.
