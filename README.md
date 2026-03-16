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

### Deployment
To deploy the application on Vercel:
1. Push your code to a Git repository.
2. Connect your repository to Vercel.
3. Follow the prompts to deploy your application.

## License
This project is licensed under the MIT License.