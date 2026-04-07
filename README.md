# Siyayya: Premium Campus Marketplace 🚀

Siyayya is a state-of-the-art, high-performance marketplace platform designed specifically for the Federal University of Kashere. It bridges the gap between student buyers and campus entrepreneurs with a fast, secure, and mobile-first trading experience.

## ✨ Core Features

- **Google-Only Authentication**: Secure campus login via verified Google accounts.
- **Mandatory Business Profiles**: Every vendor has a unique, verified Business Name.
- **Real-Time Marketplace**: Instant listings for Products and Services.
- **Glassmorphism UI**: A premium, modern aesthetic built with React and Tailwind CSS.
- **Serverless Architecture**: Powered by Firebase (Auth & Firestore) for infinite scalability.
- **Vercel Optimized**: Production-ready deployment configuration.

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, Shadcn UI, Framer Motion
- **Backend/Database**: Firebase, Firestore
- **Authentication**: Firebase Authentication (Google OAuth)
- **Deployment**: Vercel

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- Firebase Project
- Gmail App Password (for system notifications)

### Local Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/siyayya-marketplace.git
   cd siyayya-marketplace
   ```

2. **Install dependencies**:
   ```bash
   npm i
   ```

3. **Configure Environment**:
   - Create a `.env` file based on `.env.example`.
   - Update your Firebase configuration in `src/lib/firebase.ts`.

4. **Start the dev server**:
   ```bash
   npm run dev
   ```

## 🔒 Security & Verification

Siyayya enforces strict verification protocols. Only users with a university-recognized Google account can participate, and every vendor must pass a unique Business Name check during registration.

---

© 2026 Siyayya Marketplace. All rights reserved. Built for the students, by the students.
