# MenoWise (Production Foundation)

Women’s health platform for menopause + hormonal tracking with:

- Expo Router navigation
- Supabase auth + persistent backend data
- Centralized Zustand app store (`store/useAppStore.ts`)
- Localization (English, Hindi, Nepali, Spanish)
- Premium design system and reusable UI components

## Stack

- React Native + Expo
- Expo Router
- Zustand
- Supabase (`@supabase/supabase-js`)
- i18next + react-i18next + expo-localization
- TypeScript

## Project structure

```txt
/app                  # routes: auth, onboarding, tabs, settings/profile/language
/components           # reusable visual components + menu
/components/ui        # card, chip, metric tile, chart wrappers, skeleton
/store/useAppStore.ts # single source of truth
/lib                  # Supabase client + i18n setup
/i18n                 # translations
/supabase/schema.sql  # SQL schema + RLS policies + query examples
```

## Setup

1. Copy env variables:

```bash
cp .env.example .env
```

2. Fill `.env`:

```bash
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

3. Apply SQL schema in Supabase SQL editor:

`supabase/schema.sql`

4. Install + run:

```bash
bun install
bun run start
```

## Authentication flow

1. Landing
2. Login/Signup (Supabase Auth)
3. Onboarding (if profile incomplete)
4. Dashboard tabs

## Notes

- Session persistence is enabled via Supabase auth storage on AsyncStorage.
- Language selection is stored in state and synced to `users_profile.preferred_language`.
