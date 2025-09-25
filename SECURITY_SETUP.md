# 🔒 Security Setup Guide

## Required Files (Not in Git)

This project requires several configuration files with sensitive API keys. These files are **NOT** tracked in Git for security reasons.

### 1. Google Services Configuration

Copy the example files and replace with your actual values:

```bash
# Android
cp google-services.json.example google-services.json
# Then edit google-services.json and replace YOUR_GOOGLE_API_KEY_HERE

# iOS  
cp GoogleService-Info.plist.example GoogleService-Info.plist
# Then edit GoogleService-Info.plist and replace YOUR_GOOGLE_API_KEY_HERE
```

### 2. Environment Variables

Copy and configure the environment file:

```bash
cp .env.example .env
# Then edit .env and replace all placeholder values
```

### 3. Migration Script

If you need to run migrations:

```bash
cp apply-migrations-api.sh.example apply-migrations-api.sh
# Set environment variables before running
export SUPABASE_ANON_KEY="your_key_here"
export SUPABASE_URL="your_url_here"
```

## 🚨 Security Checklist

- [ ] Never commit `.env` files
- [ ] Never commit `google-services.json` or `GoogleService-Info.plist`
- [ ] Never hardcode API keys in code
- [ ] Use environment variables in edge functions
- [ ] Regularly rotate API keys
- [ ] Set up API key restrictions in Google Cloud Console

## 🔑 API Keys to Configure

1. **Google Maps/Places API**: Get from Google Cloud Console
2. **Supabase Keys**: Get from Supabase Dashboard  
3. **Google OAuth**: Configure in Google Cloud Console
4. **Resend API**: Get from Resend Dashboard

## 📱 After Setup

1. Test all API calls work correctly
2. Verify no keys appear in browser dev tools
3. Check that builds complete successfully
4. Test authentication flows

---

**Remember**: If you accidentally commit API keys, immediately:
1. Revoke/regenerate the compromised keys
2. Remove them from Git history
3. Update all configurations with new keys
