# Google OAuth Setup Guide

This guide will help you set up Google OAuth authentication for your DA-AgriManage system.

## Why Google OAuth?

- **Easy Login**: Farmers can log in using their Gmail accounts
- **No Password Required**: No need to remember another password
- **Secure**: Uses Google's secure authentication
- **Email Notifications**: Farmers receive notifications on their Gmail

## Setup Steps

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter project name: `DA-AgriManage`
4. Click "Create"

### 2. Enable Google+ API

1. In your project, go to "APIs & Services" → "Library"
2. Search for "Google+ API"
3. Click on it and click "Enable"

### 3. Create OAuth Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. If prompted, configure the OAuth consent screen:
   - User Type: **External**
   - App name: `DA-AgriManage`
   - User support email: Your email
   - Developer contact: Your email
   - Click "Save and Continue"
   - Scopes: Click "Add or Remove Scopes"
     - Select: `userinfo.email` and `userinfo.profile`
   - Click "Save and Continue"
   - Test users: Add your Gmail for testing
   - Click "Save and Continue"

4. Back to "Create OAuth client ID":
   - Application type: **Web application**
   - Name: `DA-AgriManage Web Client`
   - Authorized JavaScript origins:
     - `http://localhost:3000`
     - `https://your-domain.com` (for production)
   - Authorized redirect URIs:
     - `http://localhost:3000/auth/google/callback`
     - `https://your-domain.com/auth/google/callback` (for production)
   - Click "Create"

5. **Copy your credentials**:
   - Client ID: `xxxxx.apps.googleusercontent.com`
   - Client Secret: `xxxxx`

### 4. Update .env File

Open your `.env` file and update these values:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
```

### 5. Restart Your Application

```bash
npm run xian
```

## How It Works

### For Existing Farmers

If a farmer is already registered with email `farmer@gmail.com`:
1. They click "Continue with Google"
2. They select their Gmail account
3. System recognizes their email
4. They're logged in automatically
5. Their account is updated to use Google OAuth

### For New Farmers

If a farmer is not registered yet:
1. They click "Continue with Google"
2. They select their Gmail account
3. System creates a new farmer account automatically
4. They're logged in and can start using the system

## Testing

1. Make sure Laragon/XAMPP MySQL is running
2. Start your app: `npm run xian`
3. Go to: `http://localhost:3000/login`
4. Click "Continue with Google"
5. Select your Gmail account
6. You should be redirected to the dashboard

## Notifications

When staff send notifications or announcements:
- Farmers receive emails to their Gmail
- When they log in (via Google), they see the notifications in the dashboard
- No need to register again - just click "Continue with Google"

## Production Deployment

When deploying to production (Vercel, Railway, etc.):

1. Update `.env` with production URL:
```env
GOOGLE_CALLBACK_URL=https://your-domain.com/auth/google/callback
```

2. Add production URL to Google Cloud Console:
   - Go to your OAuth client
   - Add to "Authorized JavaScript origins": `https://your-domain.com`
   - Add to "Authorized redirect URIs": `https://your-domain.com/auth/google/callback`

## Troubleshooting

### Error: "redirect_uri_mismatch"
- Make sure the callback URL in `.env` matches exactly with Google Cloud Console
- Check for trailing slashes
- Verify the domain is correct

### Error: "Access blocked: This app's request is invalid"
- Make sure you've configured the OAuth consent screen
- Add your email as a test user
- Enable Google+ API

### Users can't log in
- Check if MySQL is running
- Verify `.env` has correct Google credentials
- Check browser console for errors

## Security Notes

- Never commit `.env` file to Git
- Keep your Client Secret private
- Use HTTPS in production
- Regularly review authorized users in Google Cloud Console

## Support

For more help:
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Passport.js Google Strategy](http://www.passportjs.org/packages/passport-google-oauth20/)
