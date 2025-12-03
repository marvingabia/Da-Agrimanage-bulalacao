# Gabay sa Google Login (Tagalog)

## Ano ang Ginawa?

Ngayon, pwede na mag-login ang mga farmers gamit ang kanilang **Gmail account**!

## Paano Gamitin?

### Para sa Farmers

1. Pumunta sa login page
2. I-click ang **"Continue with Google"**
3. Piliin ang Gmail account
4. Automatic na naka-login na!

### Para sa Naka-register na Farmers

Kung may farmer na naka-register na gamit ang email na `juan@gmail.com`:
- Pwede na siyang mag-login gamit ang Google
- Hindi na kailangan mag-register ulit
- I-click lang ang "Continue with Google"
- Piliin ang `juan@gmail.com`
- Automatic login!

### Para sa Bagong Farmers

Kung hindi pa naka-register:
- I-click ang "Continue with Google"
- Piliin ang Gmail account
- Automatic na gagawa ng account
- Role: Farmer (auto-approved)
- Pwede na gamitin ang system!

## Paano Gumana ang Notifications?

1. **Staff mag-send ng notification**
   - Email napupunta sa Gmail ng farmer
   - Example: "May bagong announcement tungkol sa palay"

2. **Farmer makakita ng email**
   - Naka-receive sa Gmail
   - May link sa system

3. **Farmer mag-login**
   - I-click ang "Continue with Google"
   - Piliin ang Gmail
   - Makikita ang lahat ng notifications sa dashboard

4. **Hindi na kailangan mag-register ulit!**
   - Gamit lang ang Gmail para mag-login
   - Lahat ng notifications nandoon na

## Paano I-setup? (Para sa Admin/Developer)

### 1. Kumuha ng Google Credentials

1. Pumunta sa: https://console.cloud.google.com/
2. Gumawa ng bagong project: "DA-AgriManage"
3. I-enable ang "Google+ API"
4. Gumawa ng OAuth credentials:
   - Type: Web application
   - Redirect URI: `http://localhost:3000/auth/google/callback`
5. I-copy ang **Client ID** at **Client Secret**

### 2. I-update ang .env File

Buksan ang `.env` file at i-paste ang credentials:

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
```

### 3. I-update ang Database

Kung meron nang users table, i-run ito sa phpMyAdmin:

```sql
USE da_agrimanage;
ALTER TABLE users ADD COLUMN googleId VARCHAR(255) AFTER authProvider;
ALTER TABLE users ADD INDEX idx_googleId (googleId);
```

O kaya i-run ang file: `add-google-oauth-column.sql`

### 4. I-restart ang App

```bash
npm run xian
```

## Mga Benepisyo

1. **Madaling Login**: Hindi na kailangan mag-remember ng password
2. **Secure**: Gumagamit ng Google authentication
3. **Email Notifications**: Direkta sa Gmail
4. **Auto-Registration**: Automatic na gagawa ng account
5. **Para sa Existing Users**: Pwede mag-switch sa Google login

## Mga Problema at Solusyon

### "redirect_uri_mismatch" error?
- I-check kung pareho ang callback URL sa `.env` at Google Console

### Hindi maka-login?
- Siguraduhing naka-run ang MySQL (Laragon/XAMPP)
- I-check kung tama ang credentials sa `.env`
- I-verify kung naka-enable ang Google+ API

### Kailangan ng tulong?
- Basahin ang `GOOGLE_OAUTH_SETUP_GUIDE.md`
- I-check ang browser console para sa errors

## Halimbawa ng Scenario

### Scenario 1: Existing Farmer

**Si Juan** ay naka-register na gamit ang:
- Email: `juan.delacruz@gmail.com`
- Password: `password123`

**Ngayon:**
- Pwede na si Juan mag-login gamit ang Google
- I-click lang ang "Continue with Google"
- Piliin ang `juan.delacruz@gmail.com`
- Automatic login, hindi na kailangan ng password!

### Scenario 2: New Farmer

**Si Maria** ay hindi pa naka-register:
- Pumunta sa login page
- I-click ang "Continue with Google"
- Piliin ang `maria.santos@gmail.com`
- Automatic na gagawa ng account
- Naka-login na agad!

### Scenario 3: Notifications

**Staff nag-send ng announcement:**
- Subject: "Bagong programa para sa mga magsasaka"
- Nag-send sa lahat ng farmers

**Si Juan naka-receive sa Gmail:**
- May email notification
- Nag-click ng link
- Nag-login gamit ang Google
- Nakita ang announcement sa dashboard

## Mga Tanong?

Kung may tanong, basahin ang:
- `GOOGLE_OAUTH_SETUP_GUIDE.md` - Detailed English guide
- `GOOGLE_OAUTH_QUICK_START.md` - Quick setup guide

O kaya i-check ang browser console para sa error messages.
