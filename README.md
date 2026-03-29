# MenoWise

MenoWise is a multilingual menopause support mobile app built with React Native (Expo) on the frontend and Python Flask services on the backend, with OpenAI models used as the LLM and Supabase as the database/storage. It combines daily check-ins, symptom trackers, insights, community support, family support, and an AI voice/chat companion into one platform to provide early care and support for women going through menopausal symptoms.

## Setup

### 1. Install frontend dependencies

```bash
npm install
```

### 2. Start the mobile app

```bash
npm run start
```

Useful commands (Currently optimized for ios and android):

```bash
npm run ios
npm run android
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

### 5. Start the backend scripts

From the project root:

```bash
python3 backend/pipeline.py
python3 backend/get_relevant_articles.py
```

Note: the relevant-articles script in this repo is named `get_relevant_articles.py`.

### 6. Build the insights cache from the PDF (If doing locally and not using supabase)

```bash
npm run build:insights-cache
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

## Demo Video/Link

**Demo Link**: 

## Try MenoWise Live

MenoWise is a native iOS/Android app — not a website. Direct APK sharing bypasses Android security checks and isn't recommended, iOS doesn't allow app installs outside the App Store without special provisioning, and official store publishing requires paid developer accounts ($99/year for iOS, $25 for Android).

To let you try it without any of that, we're running a live development server you can connect to via the **Expo Go** app:

### Steps

1. Download **Expo Go** from the [App Store](https://apps.apple.com/app/expo-go/id982107779) (iOS) or [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent) (Android)
2. We prefer you to run it on ios.
3. Scan the QR code below
   - **iOS**: use the Camera app, then tap the notification
   - **Android**: use the Scan QR Code button inside Expo Go
4. The app will load on your device

<img width="237" height="234" alt="QR_Code" src="https://github.com/user-attachments/assets/2dbaeb2a-ad21-40ff-a16d-8a76106b0047" />


> **Note:** The server runs on our local machine, so it needs to be online when you try. If the QR doesn't work, reach out and we'll spin it up — or we can enable remote access to a simulator on our personal device.

**Demo Video**

https://github.com/user-attachments/assets/a7db9607-db07-4403-8bd6-e3d24d1c87a8


## Team Member Roles

- Kritish Pokharel: Backend
- Garima Rokaya: Project Manager (Presentation + Coordination + Research)
- Ankur Gyawali: Frontend
- Manoj Nath Yogi: Full Stack + Research
- Aayushka Budathoki: UI/UX + Research
