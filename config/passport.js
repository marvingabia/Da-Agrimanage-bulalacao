import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/UserMySQL.js';

// Configure Google OAuth Strategy
export function configurePassport() {
    // Check if Google OAuth is configured
    const isGoogleConfigured = process.env.GOOGLE_CLIENT_ID && 
                                process.env.GOOGLE_CLIENT_ID !== 'your-google-client-id.apps.googleusercontent.com' &&
                                process.env.GOOGLE_CLIENT_SECRET &&
                                process.env.GOOGLE_CLIENT_SECRET !== 'your-google-client-secret';
    
    if (!isGoogleConfigured) {
        console.log('⚠️  Google OAuth not configured - skipping');
        console.log('💡 To enable: See GOOGLE_OAUTH_SETUP_GUIDE.md');
        return;
    }
    
    console.log('✅ Configuring Google OAuth...');
    
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback'
    },
    async function(accessToken, refreshToken, profile, done) {
        try {
            console.log('🔐 Google OAuth callback received for:', profile.emails[0].value);
            
            // Check if user exists with this email
            const email = profile.emails[0].value;
            let user = await User.findByEmail(email);
            
            if (user) {
                // User exists - update Google info if needed
                console.log('✅ Existing user found:', user.email);
                
                // Update authProvider to google if it was email before
                if (user.authProvider !== 'google') {
                    await User.update(user.id, {
                        authProvider: 'google',
                        googleId: profile.id
                    });
                    user.authProvider = 'google';
                }
                
                return done(null, user);
            } else {
                // New user - create account
                console.log('📝 Creating new user from Google OAuth');
                
                const newUser = {
                    name: profile.displayName,
                    email: email,
                    role: 'farmer', // Default to farmer role
                    authProvider: 'google',
                    googleId: profile.id,
                    isApproved: true, // Auto-approve Google sign-ins
                    password: null // No password for Google auth
                };
                
                const createdUser = await User.create(newUser);
                console.log('✅ New user created:', createdUser.email);
                
                return done(null, createdUser);
            }
        } catch (error) {
            console.error('❌ Google OAuth error:', error);
            return done(error, null);
        }
    }));

    // Serialize user for session
    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    // Deserialize user from session
    passport.deserializeUser(async (id, done) => {
        try {
            const user = await User.findById(id);
            done(null, user);
        } catch (error) {
            done(error, null);
        }
    });
}

export default passport;
