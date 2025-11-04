# Goveling - Travel Companion App

> **React Native + Expo** travel planning and tracking app with real-time collaboration, location services, and AI-powered features.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npx expo start

# Build for iOS/Android
npx expo run:ios
npx expo run:android
```

## 📱 Core Features

### 🏠 Home Screen
- **Current Trip Widget**: Active/upcoming trip with countdown
- **Weather Header**: Current location weather with °C/°F toggle
- **Nearby Alerts**: Distance-based notifications for saved places
- **Travel Mode**: Real-time location tracking during trips
- **Popular Places**: Global trending destinations

### 🗺️ Trip Management
- **Trip Creation**: Multi-day trips with dates, locations, and timezone support
- **Places**: Save and organize locations with Google Places integration
- **Team Collaboration**: Invite members, manage roles (owner/editor/viewer)
- **Group Features**: Split expenses and group decision voting
- **AI Smart Route**: Optimized routing for saved places
- **Accommodations**: Check-in/out dates and booking details

### 🧭 Travel Mode
- **Real-time Tracking**: Background location monitoring
- **Country Detection**: Automatic country visit logging with 3-confirmation system
- **City Detection**: Smart city-level tracking
- **Arrival Notifications**: Alerts when approaching saved places
- **Visit Logging**: Automatic trip history with dwell time tracking

### 💬 Communication
- **Trip Chat**: Real-time messaging per trip
- **Notifications**: Firebase FCM push notifications (iOS + Android)
- **Notification Inbox**: Centralized notification management
- **Team Invitations**: Push notifications for team actions

### 🔍 Explore
- **Google Places Search**: Discover places near your location
- **Category Filters**: Browse by type (restaurants, hotels, attractions, etc.)
- **Place Details**: Rich information with photos, ratings, hours, website
- **Save to Trip**: Add places directly to your trips
- **Popular Places**: Trending destinations by region

## 🏗️ Technical Architecture

### Frontend Stack
- **React Native**: Cross-platform mobile development
- **Expo SDK 52**: Development tools and native modules
- **TypeScript**: Type-safe code
- **React Navigation**: Screen routing
- **MapLibre**: Open-source map rendering
- **Expo Location**: GPS and geolocation services
- **Firebase Messaging**: Push notifications

### Backend Stack
- **Supabase**: PostgreSQL database + Auth + Storage
- **Edge Functions**: Serverless Deno functions
- **Row Level Security (RLS)**: Database-level security
- **Real-time Subscriptions**: Live data updates
- **PostGIS**: Geographic data and queries

### Key Services
- **Google Places API**: Location search and details
- **Open-Meteo**: Weather data (no API key required)
- **Firebase FCM**: Push notification delivery
- **MapLibre**: Map tiles and rendering

## 📁 Project Structure

```
├── app/                      # Expo Router screens
│   ├── (tabs)/              # Main tab navigation
│   ├── trips/               # Trip management
│   ├── explore/             # Places exploration
│   └── profile/             # User settings
├── src/
│   ├── components/          # React components
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utilities and helpers
│   ├── services/            # Business logic
│   ├── contexts/            # React Context providers
│   └── types/               # TypeScript definitions
├── supabase/
│   ├── migrations/          # Database schema
│   └── functions/           # Edge Functions
└── assets/                  # Images, fonts, animations
```

## 🗄️ Database Schema

### Core Tables
- `profiles`: User data and preferences
- `trips`: Trip information
- `trip_members`: Team collaboration
- `trip_places`: Saved locations per trip
- `trip_expenses`: Shared expenses
- `trip_decisions`: Group voting
- `accommodations`: Lodging details
- `messages`: Trip chat
- `notifications_inbox`: Push notifications
- `device_tokens`: FCM registration

### Location Tracking
- `visited_countries`: Country visit history
- `visited_cities`: City visit history  
- `place_visits`: Individual place check-ins

### Caching
- `country_cache`: Reverse geocoding cache
- `city_cache`: City metadata cache
- `shared_place_saves`: Popular places tracking

## 🔐 Environment Setup

Create `.env` file:

```env
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Google Places
EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=your-google-api-key

# Firebase (for push notifications)
# Place files: 
# - ios/GoogleService-Info.plist
# - android/app/google-services.json
```

### Supabase Secrets (Edge Functions)
```bash
supabase secrets set GOOGLE_PLACES_API_KEY=your-key
supabase secrets set FCM_SERVER_KEY=your-fcm-server-key
```

## 🚀 Deployment

### Database Migrations
```bash
# Deploy schema changes
supabase db push

# Or via Supabase CLI
supabase migration up
```

### Edge Functions
```bash
# Deploy all functions
supabase functions deploy weather_now --no-verify-jwt
supabase functions deploy push_send --no-verify-jwt
supabase functions deploy smart_route --no-verify-jwt
supabase functions deploy nearby_places_v2 --no-verify-jwt
supabase functions deploy city_details --no-verify-jwt
```

### Mobile App
```bash
# Development builds
npx expo run:ios
npx expo run:android

# Production builds with EAS
eas build --platform ios
eas build --platform android

# OTA Updates
eas update --branch production
```

## 🔧 Configuration

### Firebase Setup
1. Create Firebase project at console.firebase.google.com
2. Add iOS and Android apps
3. Download config files:
   - `GoogleService-Info.plist` → `ios/`
   - `google-services.json` → `android/app/`
4. Add FCM Server Key to Supabase secrets

### Google Places API
1. Enable in Google Cloud Console:
   - Places API
   - Places API (New)
   - Geocoding API
2. Create API key and restrict to mobile apps
3. Add to `.env` and Supabase secrets

### MapLibre Setup
Uses open-source tiles - no API key needed!

## 🧪 Testing

```bash
# TypeScript check
npx tsc --noEmit

# ESLint
npx eslint .

# Run specific linting
npx eslint src/components/

# Auto-fix issues
npx eslint . --fix
```

## 📊 Key Features Deep Dive

### Travel Mode Implementation
- **Background Location**: Uses `expo-location` with accuracy optimization
- **Country Detection**: 3-confirmation system to prevent false positives
- **Offline Support**: Caches geocoding results
- **Battery Optimization**: Smart polling intervals
- **Privacy**: Location only tracked when Travel Mode is active

### Real-time Chat
- **Supabase Realtime**: WebSocket-based updates
- **Message Types**: Text, images (future: voice, location)
- **Read Receipts**: Track message read status
- **Typing Indicators**: Show when users are typing
- **Push Notifications**: Alert offline users

### Group Features
- **Expense Splitting**: Track shared costs
- **Decision Voting**: Democratic group choices
- **Role-based Access**: Owner, editor, viewer permissions
- **Real-time Sync**: Instant updates across devices

### Popular Places System
- **Global Tracking**: Monitors place saves across all users
- **Time Windows**: 1h, 6h, 24h trending calculations
- **Regional Filtering**: Shows relevant places by continent/country
- **Traffic Levels**: Indicates current popularity
- **Badges**: "🔥 Trending", "🌍 Iconic", "🚀 Rising"

## 🎨 UI/UX Highlights

- **Native Components**: iOS/Android specific UI elements
- **Smooth Animations**: Lottie animations for key interactions
- **Skeleton Loading**: Content placeholders during data fetch
- **Pull to Refresh**: Native refresh gestures
- **Haptic Feedback**: Tactile responses on interactions
- **Dark Mode Ready**: Theme system in place (future activation)

## 🔒 Security

- **Row Level Security (RLS)**: All tables protected
- **JWT Authentication**: Supabase Auth tokens
- **API Key Restrictions**: Google APIs limited to app
- **Input Validation**: Client and server-side checks
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Sanitized user inputs

## 📈 Performance Optimizations

- **Caching Strategy**: 
  - Country/city geocoding results
  - Place details from Google
  - Route calculations
- **Lazy Loading**: Components loaded on demand
- **Image Optimization**: Compressed and cached
- **Query Optimization**: Indexed database queries
- **Batch Operations**: Reduce API calls

## 🐛 Known Issues & Limitations

- TypeScript errors in legacy components (non-blocking)
- ESLint warnings for inline styles (planned refactor)
- Some documentation files outdated (cleanup needed)
- Dark mode UI incomplete
- Voice messages not implemented
- Location sharing requires manual enable per trip

## 🗺️ Roadmap

### Planned Features
- [ ] Voice messages in chat
- [ ] Location sharing live map
- [ ] Expense receipt scanning
- [ ] Multi-language support
- [ ] Offline mode improvements
- [ ] Social features (trip sharing, followers)
- [ ] Trip templates
- [ ] Budget tracking
- [ ] Travel insurance integration

### Technical Improvements
- [ ] Complete TypeScript migration
- [ ] ESLint rule compliance
- [ ] Component testing suite
- [ ] E2E testing setup
- [ ] Performance monitoring
- [ ] Analytics integration
- [ ] Crash reporting
- [ ] Documentation cleanup (this PR!)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📝 License

This project is proprietary software. All rights reserved.

## 👥 Team

- **Developer**: Sebastian Araos
- **Backend**: Supabase + PostgreSQL
- **Mobile**: React Native + Expo

## 📞 Support

For issues or questions:
- GitHub Issues: [Create an issue]
- Email: araos.sebastian@gmail.com

---

**Last Updated**: November 2025
**Version**: 1.0.0
**Status**: Active Development
