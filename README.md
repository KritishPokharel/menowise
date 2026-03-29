# MenoWise

MenoWise is a multilingual menopause support app built with React Native on the frontend and Python Flask services on the backend. It combines daily check-ins, insights, community support, and an AI voice/chat companion into one experience to help women to help women prepare better for this.

## Setup

### 1. Install frontend dependencies

```bash
npm install
```

### 2. Start the mobile app

```bash
npm run start
```

Useful commands:

```bash
npm run ios
npm run android
npm run web
npm run typecheck
```

### 3. Configure frontend environment

Create a `.env` file if your local setup needs one and add the required Supabase values:

```bash
EXPO_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

### 4. Start the voice backend

From the project root, run the Flask backend inside `voice_backend`:

```bash
python3 voice_backend/eleven_labs_intregation.py
```

Set these environment variables before running it:

```bash
eleven_labs_api_key=YOUR_ELEVENLABS_API_KEY
ELEVENLABS_AGENT_ID=YOUR_ELEVENLABS_AGENT_ID
PUBLIC_BASE_URL=YOUR_PUBLIC_BACKEND_URL
```

## Technologies Used

- React Native
- Expo
- Expo Router
- TypeScript
- Zustand
- Supabase
- i18next
- React Native WebView
- Python Flask
- GPT-5.2
- GPT-OSS-20B
- ElevenLabs Conversational AI

## Project Areas

- `app/`: Expo Router screens and tab flows
- `components/`: reusable UI and feature components
- `store/`: Zustand app state
- `i18n/`: translations
- `services/` and `data/`: insights parsing and cached article loading
- `voice_backend/`: Flask-based voice/chat backend and templates

## Team Member Roles

- Kritish Pokharel: Backend
- Garima Rokaya: Project Manager (Presentation + Coordination + Research)
- Ankur Gyawali: Frontend
- Manoj Nath Yogi: Full Stack + Research
- Aayushka Budathoki: UI/UX + Research
