# Google OAuth - Quick Start

## ✅ What's Been Added

Your DA-AgriManage system now supports **Google Sign-In** for farmers!

## 🚀 Quick Setup (5 minutes)

### Step 1: Get Google Credentials

1. Go to: https://console.cloud.google.com/
2. Create a new project: "DA-AgriManage"
3. Enable "Google+ API"
4. Create OAuth credentials:
   - Type: Web application
   - Authorized redirect URI: `http://localhost:3000/auth/google/callback`
5. Copy your **Client ID** and **Client Secret**

### Step 2: Update .env File

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
```

### Step 3: Update Database (if existing)

If you already have a users table, run this in phpMyAdmin:

```sql
USE da_agrimanage;
ALTER TABLE users ADD COLUMN googleId VARCHAR(255) AFTER authProvider;
ALTER TABLE users ADD INDEX idx_googleId (googleId);
```

Or just run: `add-google-oauth-column.sql` in phpMyAdmin

### Step 4: Restart App

```bash
npm run xian
```

## ✨ How It Works

### For Farmers

1. Go to login page
2. Click "Continue with Google"
3. Select Gmail account
4. Automatically logged in!

### For Existing Registered Farmers

- If farmer already registered with `farmer@gmail.com`
- They can now login with Google using that same email
- No need to register again!

### For New Farmers

- Click "Continue with Google"
- Account automatically created
- Role: Farmer (auto-approved)
- Can immediately use the system

## 📧 Notifications

When staff send notifications:
- Email sent to farmer's Gmail
- Farmer clicks "Continue with Google" to login
- Sees all notifications in dashboard
- No password needed!

## 🔧 Files Modified

- ✅ `config/passport.js` - Google OAuth configuration
- ✅ `index.js` - Passport initialization
- ✅ `routes/index.js` - Google OAuth routes
- ✅ `views/login.xian` - Google Sign-In button enabled
- ✅ `config/database.js` - Added googleId field
- ✅ `.env` - Google credentials
- ✅ `package.json` - Added passport packages

## 📚 Full Documentation

See `GOOGLE_OAUTH_SETUP_GUIDE.md` for detailed setup instructions.

## 🎯 Benefits

1. **Easy Login**: No password to remember
2. **Secure**: Uses Google's authentication
3. **Email Integration**: Notifications go to Gmail
4. **Auto-Registration**: New farmers auto-created
5. **Existing Users**: Can switch to Google login

## 🐛 Troubleshooting

**"redirect_uri_mismatch" error?**
- Check callback URL in `.env` matches Google Console exactly

**Can't log in?**
- Make sure MySQL is running (Laragon/XAMPP)
- Check `.env` has correct credentials
- Verify Google+ API is enabled

**Need help?**
- See `GOOGLE_OAUTH_SETUP_GUIDE.md`
- Check browser console for errors
