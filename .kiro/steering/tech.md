# Technology Stack

## Framework & Platform

- **React Native** with **Expo SDK 54** - Cross-platform mobile development
- **Expo Router** - File-based routing system with typed routes
- **TypeScript** - Strict typing enabled for better code quality
- **Hermes** JavaScript engine with new architecture enabled

## Backend & Database

- **Supabase** - Backend-as-a-Service with PostgreSQL database
- **Supabase Auth** - Authentication with OAuth (Google) and PKCE flow
- **Real-time subscriptions** - Live data updates via Supabase

## State Management & Data Fetching

- **TanStack React Query** - Server state management and caching
- **React Context** - Global state for auth, theme, alerts, and subscriptions
- **AsyncStorage** - Local persistence for session management

## UI & Styling

- **React Native StyleSheet** - Component styling
- **Lucide React Native** - Icon library
- **Custom theme system** - Dark/light mode support via ThemeContext
- **React Native Reanimated** - Smooth animations and gestures

## Key Libraries

- **Zod** - Runtime type validation and form schemas
- **React Hook Form** - Form management with validation
- **Expo Maps** - Location and mapping features
- **Expo Camera/Image Picker** - Media capture capabilities
- **React Native Purchases** - In-app subscription management
- **OpenAI** - AI-powered features and suggestions

## Development Tools

- **Prettier** - Code formatting (single quotes, 2 spaces, no tabs)
- **ESLint** - Code linting via Expo
- **EAS Build** - Cloud-based builds and deployments

## Common Commands

```bash
# Development
npm run dev              # Start Expo development server
npm run android         # Run on Android device/emulator
npm run ios            # Run on iOS device/simulator

# Building
npm run build:web      # Build for web platform
npm run lint          # Run ESLint checks

# Database
npx supabase start    # Start local Supabase instance
npx supabase db reset # Reset local database
```

## Environment Variables

- `EXPO_PUBLIC_SUPABASE_URL` - Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `EXPO_PUBLIC_GOOGLE_CLIENT_ID` - Google OAuth client ID
