# Goveling - Bolt.new Setup Instructions

This is an Expo React Native project optimized for both local development and Bolt.new.

## 🚀 Quick Start for Bolt.new

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```
   
   Or if you encounter issues:
   ```bash
   npm run web
   ```

## 🔧 Alternative Commands

If you encounter `expo-internal command not found`:

1. **Try the web-only version:**
   ```bash
   npm run web
   ```

2. **Or install Expo CLI globally:**
   ```bash
   npm install -g @expo/cli
   npm run dev
   ```

3. **Fallback option:**
   ```bash
   npx expo start --web
   ```

## 📱 Platform Support

- **Web**: Fully supported in Bolt.new
- **Mobile**: Use Expo Go app for testing
- **Production**: Build with `npm run web:build`

## 🔐 Environment Variables

Make sure to set up your environment variables in Bolt.new:

```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 🛠️ Troubleshooting

1. **Command not found errors**: Use `npx` prefix for all expo commands
2. **Module resolution issues**: Clear cache with `expo r -c`
3. **Build errors**: Try `npm run prebuild` first

## 📂 Project Structure

- `app/` - Expo Router pages
- `src/` - Shared components and utilities  
- `assets/` - Static assets
- `supabase/` - Database functions and migrations

## 🎯 Features

- ✅ Authentication system
- ✅ Modern UI with gradients
- ✅ Profile management
- ✅ Trip planning
- ✅ Place exploration
- ✅ Responsive design
