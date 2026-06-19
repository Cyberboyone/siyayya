# Siyayya: Premium Campus Marketplace 🚀

![Siyayya Cover Image](https://via.placeholder.com/1200x400/0f172a/ffffff?text=Siyayya+Marketplace)

Siyayya is a state-of-the-art, high-performance marketplace platform designed specifically for university students in Northern Nigeria. It bridges the gap between student buyers and campus entrepreneurs with a fast, secure, and mobile-first trading experience.

## ✨ Core Features

*   **Google-Only Authentication:** Secure campus login via verified Google accounts.
*   **Mandatory Business Profiles:** Every vendor has a unique, verified Business Name.
*   **Real-Time Marketplace:** Instant listings for Products and Services.
*   **Discovery Feed:** Personalized product discovery based on user location and interests.
*   **Glassmorphism UI:** A premium, modern aesthetic built with React and Tailwind CSS.
*   **Serverless Architecture:** Powered by Firebase (Auth & Firestore) for infinite scalability.
*   **PWA Ready:** Installable progressive web app with push notifications.

## 🛠️ Technology Stack

*   **Frontend:** React 18, TypeScript, Vite
*   **Routing:** React Router DOM
*   **Styling:** Tailwind CSS, Shadcn UI, Framer Motion
*   **Backend/Database:** Firebase Authentication, Firestore Database, Firebase Storage
*   **State Management:** React Context, Zustand
*   **Data Fetching:** React Query (TanStack Query)
*   **Testing:** Vitest, React Testing Library, Playwright
*   **Deployment:** Vercel

## 📁 Folder Structure

```
siyayya-main/
├── api/                  # Vercel Serverless Functions
├── docs/                 # Project Documentation
├── e2e/                  # Playwright End-to-End Tests
├── public/               # Static assets
└── src/
    ├── components/       # Shared UI components (Shadcn + Custom)
    ├── features/         # Feature-based modules (auth, marketplace, messaging, etc.)
    ├── hooks/            # Custom React hooks
    ├── lib/              # Utility functions, Firebase setup, mock data
    ├── test/             # Test setup files
    └── types/            # Global TypeScript definitions
```

## 🚀 Getting Started

### Prerequisites

*   Node.js (v18 or higher)
*   Firebase Project (Auth, Firestore, Storage)
*   Google Cloud Console Project (OAuth 2.0 Credentials)

### 1. Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/yourusername/siyayya-marketplace.git
cd siyayya-marketplace
npm install
```

### 2. Environment Setup

Create a `.env` file in the root directory based on `.env.example`:

```bash
cp .env.example .env
```

Fill in your actual credentials for Firebase, Google OAuth, and any other services. See the [Environment Configuration Guide](docs/troubleshooting.md#environment-variables) for more details.

### 3. Running Locally

Start the Vite development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

### 4. Building for Production

To create a production build:

```bash
npm run build
```

The compiled assets will be placed in the `dist/` directory. You can preview the build locally using `npm run preview`.

## 🚢 Deployment Process

Siyayya is optimized for deployment on Vercel.

1.  Connect your GitHub repository to Vercel.
2.  Configure the environment variables in the Vercel dashboard.
3.  Vercel will automatically build and deploy the application on every push to the `main` branch.

See the [Maintenance Guide](docs/maintenance.md#deployment-process) for detailed instructions.

## 🤝 Contributing

We welcome contributions! Please see our [Contributor Guide](CONTRIBUTING.md) for information on branching strategy, commit conventions, code review expectations, and more.

Please also review our [Coding Standards](docs/coding-standards.md) before submitting a pull request.

## 📚 Documentation

For deep dives into specific areas of the application, please consult the `docs/` directory:

*   [Architecture Documentation](docs/architecture.md)
*   [Firestore Schema](docs/firestore-schema.md)
*   [API & Services](docs/api-services.md)
*   [Troubleshooting Guide](docs/troubleshooting.md)
*   [Project Maintenance](docs/maintenance.md)

## 📄 License

© 2026 Siyayya Marketplace. All rights reserved. Built for the students, by the students.
