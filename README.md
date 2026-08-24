# LeadFlow CRM - Real-Time Sales & Telecalling Management Platform

Modern, lightning-fast CRM built for high-performance sales teams and telecallers with live Google Sheets integration, Round-Robin lead auto-assignment, instant 1-tap dialer, and Cloud Firestore persistence.

---

## 🌟 Key Features

- **📊 Live Google Sheets Auto-Scan & Sync**: Synchronizes leads directly from Google Sheets every 1–3 minutes, automatically distributing them to active telecallers.
- **⚡ 1-Click Lead Allocation**: Bulk assign or transfer hundreds of leads to specific telecallers with a single click.
- **📱 Mobile-First Responsive Design**: Optimized mobile card view with 1-tap direct dialing, WhatsApp messaging, and questionnaire answers.
- **🎯 Dynamic Client Questionnaire**: Automatically parses and filters client answers (GST status, timeline, Amazon seller account) while omitting raw ad metadata.
- **📞 Calling Assistant & Follow-up Manager**: Log call outcomes, discussion notes, deal closed value, and schedule future follow-ups.
- **👥 Role-Based Access Control**:
  - **Super Admin**: View all leads, team leaderboard, sheet configuration, and telecaller credential management.
  - **Telecallers / Staff**: Dedicated view with only their assigned leads, daily target metrics, and quick calling tools.
- **☁️ Multi-Layer Persistence**: Real-time Firebase Cloud Firestore sync + Next.js server storage fallback.

---

## 🚀 Tech Stack

- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/)
- **UI / Styling**: [Tailwind CSS](https://tailwindcss.com/) with custom vibrant light theme
- **Database**: [Google Cloud Firestore](https://firebase.google.com/docs/firestore)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Charts**: [Recharts](https://recharts.org/)

---

## 🛠️ Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/dhanbyte/crm-leads.git
cd crm-leads
```

### 2. Install dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Create `.env.local` based on `.env.example`:
```env
NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSyA1umHq6NN2mSwBJXhmgMzRzd3bvZlDVzg"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="crm-tool-34eba.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="crm-tool-34eba"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="crm-tool-34eba.firebasestorage.app"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="678286875856"
NEXT_PUBLIC_FIREBASE_APP_ID="1:678286875856:web:099655c03230aa453cd2d5"
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="G-ETSM23G09C"
```

### 4. Run Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to access the CRM.

---

## 🔐 Default Admin Login

- **Email**: `admin@salescrm.com`
- **Password**: `admin`
*(Telecallers log in with credentials created by Admin in the Staff & Team tab).*

---

## 📄 License
MIT License
