# 🛡️ EcoShield SecureRoute

> **Cybersecurity for EV Charging.**
>
> EcoShield SecureRoute helps EV drivers find **safe, trusted charging stations** by combining live charger locations with cybersecurity intelligence powered by Google's Gemini AI.
>
> Visit our publically available demo:
> https://hackathon26bloomhacks.web.app/

---

## 🌎 Inspiration

Electric vehicle chargers are becoming increasingly connected devices. Modern charging stations communicate using protocols like ISO 15118, process payments, authenticate vehicles, and connect to cloud infrastructure—making them an emerging cybersecurity target.

Today, drivers have no easy way to know whether a charger is trustworthy before plugging in.

We wanted security to be as simple as Google Maps:

**Open the app → Find a charger → Know if it's safe before you plug in.**

---

# 🚗 What It Does

EcoShield SecureRoute provides drivers with a cybersecurity-aware charging map.

Users can:

- 🗺️ Browse nearby EV charging stations
- 🟢 View stations labeled as **Verified**
- 🟡 See stations marked **Use With Care**
- 🔴 Avoid **Compromised** charging stations
- 📍 Get navigation directly to safe chargers
- ❤️ Save favorite charging locations
- 🔐 View plain-language explanations of charger security risks

Instead of overwhelming users with CVEs or technical security reports, EcoShield converts complex cybersecurity data into simple recommendations drivers can understand instantly.

---

# 🧠 How It Works

The platform combines multiple data sources:

- NREL Alternative Fuel Stations dataset
- Firebase Firestore
- Google Maps Platform
- Google Cloud Run backend
- Gemini AI vulnerability analysis
- EVerest charger session logs

### Workflow

```
EV Charger
      │
      ▼
EVerest Logs
      │
      ▼
Gemini AI analyzes session behavior
      │
      ▼
Risk Classification

SAFE
CAUTION
COMPROMISED
      │
      ▼
Stored in Firestore
      │
      ▼
Displayed on Google Maps
```

Drivers only see an easy-to-understand security status while the technical analysis happens behind the scenes.

---

# 🛠️ Tech Stack

## Frontend

- React Native
- Expo
- TypeScript
- Google Maps API

## Backend

- Python
- Flask
- Google Cloud Run

## Cloud

- Firebase Authentication
- Firestore
- Firebase Hosting
- Google Cloud

## AI

- Google Gemini
- Prompt-based vulnerability classification
- Natural language security summaries

---

# 📱 Features

### Interactive Security Map

Locate nearby charging stations with real-time security indicators.

### AI Security Analysis

Gemini interprets charger session logs and generates human-readable risk assessments.

### Charger Details

Each charger includes:

- Connector types
- Estimated charging speed
- Security rating
- Last security scan
- Risk explanation

### Authentication

Users can:

- Sign in securely
- Save favorites
- Track recent charging locations

---

# 🧩 Architecture

```
React Native App
        │
        ▼
Firebase Authentication
        │
        ▼
Firestore Database
        │
        ▼
Google Cloud Run Backend
        │
        ▼
Gemini AI
        │
        ▼
EVerest Session Logs
```

---

# 🚀 Getting Started

## Clone the repository

```bash
git clone https://github.com/yourusername/EcoShieldSecureRoute.git
```

## Install dependencies

```bash
npm install
```

## Start Expo

```bash
npx expo start
```

## Backend

```bash
cd backend

pip install -r requirements.txt

python app.py
```

---

# 🔥 Firebase

The project uses:

- Authentication
- Firestore
- Hosting

Create a `.env` file with your Firebase configuration:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=

EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=
```

---

# ☁️ Deployment

Frontend

```bash
firebase deploy
```

Backend

```bash
gcloud run deploy
```

---

# 🎯 Future Improvements

- Live charger health monitoring
- Automatic CVE database integration
- Vehicle-specific charging recommendations
- Crowdsourced station reports
- Historical security trends
- Enterprise fleet dashboard
- Predictive attack detection

---

# 👥 Team

Built during **BloomHacks 2026**.

### Contributors

- Brayden Coggin
- Alexa Jimenez
- Keoni Yandall
- Brandon Enlund

---

# 💡 Why EcoShield?

Most navigation apps answer:

> "Where can I charge?"

EcoShield answers:

> **"Where can I charge safely?"**

By combining cybersecurity, artificial intelligence, and real-world EV infrastructure, EcoShield helps make the growing EV ecosystem more secure for everyone.

---

## 🏆 Built for BloomHacks 2026

Protecting EV drivers one charger at a time.
