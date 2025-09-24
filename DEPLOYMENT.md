# 🚀 Goveling Deployment Guide

## Quick Deployment to Vercel

### 1. Prerequisites
- Node.js 18+ installed
- Vercel account
- All environment variables configured

### 2. Environment Variables Setup
Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Required variables:
- `EXPO_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` - Google Maps API key

### 3. Local Testing
```bash
# Install dependencies
npm install

# Test web build locally
npm run build

# Serve locally to test
npx serve dist
```

### 4. Deploy to Vercel

#### Option A: GitHub Integration (Recommended)
1. Push code to GitHub repository
2. Go to [vercel.com](https://vercel.com)
3. Import your GitHub repository
4. Configure environment variables in Vercel dashboard
5. Deploy!

#### Option B: Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### 5. Configure Environment Variables in Vercel
In your Vercel dashboard, add these environment variables:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`
- `NODE_ENV=production`

### 6. Mobile Apps (iOS/Android)

#### For Development
```bash
# iOS Simulator
npm run ios

# Android Emulator
npm run android

# Expo Go
npm run dev:local
```

#### For Production (App Stores)
```bash
# Install EAS CLI
npm install -g @expo/eas-cli

# Configure EAS
eas build:configure

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

## 🔧 Build Commands Reference

- `npm run build` - Build for web (Vercel)
- `npm run dev` - Start development server (web)
- `npm run dev:local` - Start development server (all platforms)
- `npm run ios` - Run on iOS simulator
- `npm run android` - Run on Android emulator

## 📱 Platform Support

✅ **Web** - Deployed to Vercel  
✅ **iOS** - Native app via Expo/EAS  
✅ **Android** - Native app via Expo/EAS  

## 🚨 Common Issues

### Build Fails
- Ensure all environment variables are set
- Check that all dependencies are installed
- Verify Node.js version (18+)

### Web App Not Loading
- Check browser console for errors
- Verify environment variables in Vercel dashboard
- Check that static files are being served correctly

### Mobile App Issues
- Use `expo doctor` to check for configuration issues
- Ensure all native dependencies are properly configured
- Check that Google Services files are in place (iOS/Android)

## 🎯 Next Steps After Deployment

1. **Custom Domain**: Configure custom domain in Vercel
2. **Analytics**: Add analytics tracking
3. **Performance**: Monitor Core Web Vitals
4. **SEO**: Add meta tags and structured data
5. **PWA**: Configure service worker for offline support

## 📞 Support

For deployment issues, check:
- [Expo Documentation](https://docs.expo.dev)
- [Vercel Documentation](https://vercel.com/docs)
- Project GitHub Issues
