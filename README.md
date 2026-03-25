# 🏋️‍♂️ WellTrackD

**WellTrackD** is a comprehensive health and fitness tracking Progressive Web App (PWA) that helps you monitor and improve your wellness journey. Track workouts, steps, and BMI — all in one place.

![React](https://img.shields.io/badge/React-19-blue)
![Firebase](https://img.shields.io/badge/Firebase-12-orange)
![PWA](https://img.shields.io/badge/PWA-enabled-brightgreen)

---

## 🌐 Live Demo

🚀 **Try WellTrackD Live:**  
👉 https://welltrackd.sansolutionhub.in/

---

## Features

- 🏋️ **Workout Tracking** — Log exercises with sets and reps; view workout history
- 📋 **Workout Plans** — Create, manage, and share customized workout plans with Excel import/export
- 👣 **Step Tracker** — Monitor daily steps with optional Google Fit integration and trend charts
- ⚖️ **BMI Tracking** — Calculate and track Body Mass Index over time with visualizations
- 📱 **PWA Support** — Installable app with offline capability and background sync
- 🌙 **Dark / Light Theme** — System-aware theme with manual toggle
- 📊 **Data Visualisation** — Interactive charts powered by Recharts

---

## Tech Stack

| Category     | Technology                                   |
| ------------ | -------------------------------------------- |
| Frontend     | React 19, React Router DOM 7                 |
| Build tool   | Vite 7                                       |
| UI / Styling | Material-UI (MUI) 7, Tailwind CSS 4, Emotion |
| Backend      | Firebase 12 (Auth + Firestore)               |
| Charts       | Recharts 3                                   |
| Utilities    | date-fns, XLSX, file-saver, react-markdown   |
| PWA          | Vite PWA Plugin (Workbox)                    |
| Linting      | ESLint 9                                     |

---

## Getting Started

### Prerequisites

- **Node.js** v18 or later
- **npm** v9 or later
- A [Firebase](https://firebase.google.com/) project with Authentication and Firestore enabled

### Installation

```bash
# Clone the repository
git clone https://github.com/VibeStackLabs/WellTrackD.git
cd WellTrackD

# Install dependencies
npm install
```

### Firebase Configuration

Open `src/firebase.js` and replace the `firebaseConfig` object with your own Firebase project credentials:

```js
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
};
```

### Step Tracker Google Fit Integration

To enable Google Fit integration for the Step Tracker feature, follow these steps:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project or select an existing one.
3. Navigate to "APIs & Services" > "Library".
4. Search for "Google Fit API" and enable it for your project.
5. Go to "APIs & Services" > "Credentials".
6. Click "Create Credentials" and select "OAuth client ID".
7. Choose "Web application" as the application type.
8. Add `http://localhost:5173` to the "Authorized JavaScript origins".
9. Add `http://localhost:5173/auth/google/callback` to the "Authorized redirect URIs".
10. Click "Create" and note down the Client ID and Client Secret.

Open `src/App.jsx` and replace the `googleClientId` variable with your actual Google Client ID:

```js
const googleClientId = "YOUR_GOOGLE_CLIENT_ID";
```

### Running Locally

```bash
# Start the development server (with HMR)
npm run dev
```

The app will be available at `http://localhost:5173` by default.

---

## Available Scripts

| Command           | Description                                          |
| ----------------- | ---------------------------------------------------- |
| `npm run dev`     | Start development server with Hot Module Replacement |
| `npm run build`   | Create an optimized production build in `dist/`      |
| `npm run preview` | Serve the production build locally for testing       |
| `npm run lint`    | Run ESLint across the project                        |

---

## Project Structure

```
WellTrackD/
├── public/               # Static assets & PWA icons
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── BMIChart.jsx
│   │   ├── Profile.jsx
│   │   ├── ProfileEditDialog.jsx
│   │   ├── ShareDialog.jsx
│   │   ├── WorkoutPlanExcelHandler.jsx
│   │   └── StepTracker/
│   ├── contexts/         # React context providers
│   │   ├── AdminContext.jsx
│   │   └── ThemeContext.jsx
│   ├── pages/            # Route-level page components
│   │   ├── Dashboard.jsx
│   │   ├── Login.jsx
│   │   ├── Signup.jsx
│   │   ├── WorkoutPlans.jsx
│   │   ├── StepTracker.jsx
│   │   └── AdminDashboard.jsx
│   ├── services/         # External service integrations
│   │   └── googleFitService.js
│   ├── utils/            # Shared helper functions
│   ├── App.jsx           # Root component & routing
│   ├── firebase.js       # Firebase initialization
│   └── main.jsx          # Application entry point
├── index.html
├── vite.config.js
├── tailwind.config.js
└── package.json
```

---

## Deployment

The project is configured for deployment on **Netlify** (`netlify.toml` included). Any push to the main branch will trigger an automatic build and deploy.

For manual deployment:

```bash
npm run build
# Deploy the contents of the dist/ folder to your hosting provider
```

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m "Add my feature"`
4. Push to your branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

## License

This project is open source.
