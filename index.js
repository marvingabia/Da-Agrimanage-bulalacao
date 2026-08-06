/*
    MIT License
    
    Copyright (c) 2025 Christian I. Cabrera || XianFire Framework
    Mindoro State University - Philippines

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
    */
    
import 'dotenv/config';
import express from "express";
import path from "path";
import session from "express-session";
import MySQLStoreFactory from "express-mysql-session";
import router from "./routes/index.js";
import fs from 'fs';
import hbs from "hbs";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { initDatabase, getPool } from "./config/database.js";
import passport from "./config/passport.js";
import { configurePassport } from "./config/passport.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize MySQL Database Connection — required, no fallback on Vercel
try {
    await initDatabase();
    console.log('✅ MySQL database initialized successfully');
} catch (error) {
    console.error('❌ MySQL connection failed:', error.message);
    // On Vercel, we must have a DB. Log the error but continue — 
    // individual requests will fail gracefully with 500 errors.
}

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(process.cwd(), "public")));

// ── Sessions ─────────────────────────────────────────────────────────────────
// MySQL session store — required for Vercel (serverless has no shared memory)
let sessionStore;
const pool = getPool();
if (pool) {
    try {
        const MySQLStore = MySQLStoreFactory(session);
        sessionStore = new MySQLStore({
            expiration: 24 * 60 * 60 * 1000,
            createDatabaseTable: true,
            clearExpired: true,
            checkExpirationInterval: 900000, // 15 minutes
            schema: {
                tableName: 'sessions',
                columnNames: {
                    session_id: 'session_id',
                    expires: 'expires',
                    data: 'data'
                }
            }
        }, pool);
        console.log('✅ MySQL session store initialized');
    } catch (sessionStoreError) {
        console.error('❌ Session store setup failed:', sessionStoreError.message);
        sessionStore = undefined;
    }
} else {
    console.error('❌ No MySQL pool available — sessions will not persist across Vercel instances!');
    // Try to get pool again after init (race condition fix)
    try {
        const retryPool = getPool();
        if (retryPool) {
            const MySQLStore = MySQLStoreFactory(session);
            sessionStore = new MySQLStore({ expiration: 24 * 60 * 60 * 1000, createDatabaseTable: true }, retryPool);
            console.log('✅ MySQL session store initialized (retry)');
        }
    } catch (e) {
        console.error('❌ Session store retry failed:', e.message);
    }
}

app.use(session({
    secret: process.env.SESSION_SECRET || 'xianfire-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    store: sessionStore || undefined,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,   // 24 hours
        sameSite: 'lax'
    },
    proxy: process.env.NODE_ENV === 'production'
}));

// Initialize Passport for Google OAuth
configurePassport();
app.use(passport.initialize());
app.use(passport.session());

// Trust proxy for Vercel
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.engine("xian", async (filePath, options, callback) => {
  try {
     const originalPartialsDir = hbs.partialsDir;
    hbs.partialsDir = path.join(__dirname, 'views');

    const result = await new Promise((resolve, reject) => {
      hbs.__express(filePath, options, (err, html) => {
        if (err) return reject(err);
        resolve(html);
      });
    });

    hbs.partialsDir = originalPartialsDir;
    callback(null, result);
  } catch (err) {
    callback(err);
  }
});

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "xian");

// Register Handlebars helpers
hbs.registerHelper('eq', function(a, b) {
  return a === b;
});

hbs.registerHelper('firstChar', function(str) {
  return str ? str.charAt(0).toUpperCase() : 'A';
});

hbs.registerHelper('default', function(value, defaultValue) {
  return value || defaultValue;
});

hbs.registerHelper('or', function() {
  return Array.prototype.slice.call(arguments, 0, -1).some(Boolean);
});

hbs.registerHelper('substring', function(str, start, end) {
  if (!str) return '';
  return str.substring(start, end);
});
const partialsDir = path.join(__dirname, "views/partials");

// Load partials SYNCHRONOUSLY so they are ready before any request hits
try {
  const files = fs.readdirSync(partialsDir);
  files
    .filter(file => file.endsWith('.xian'))
    .forEach(file => {
      const partialName = file.replace('.xian', '');
      const fullPath = path.join(partialsDir, file);
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        hbs.registerPartial(partialName, content);
      } catch (err) {
        console.error(`❌ Failed to read partial: ${file}`, err);
      }
    });
  console.log('✅ All partials loaded successfully');
} catch (err) {
  console.error("❌ Could not read partials directory:", err);
}

// Import your route files
import adminRoutes from './routes/adminRoutes.js'; // Assuming you have this
import crudRoutes from './routes/crudRoutes.js';   // The new routes for staff

app.use("/", router);
app.use('/api/admin', adminRoutes); // All admin routes are prefixed with /api/admin
app.use('/api/staff', crudRoutes);  // All staff CRUD routes are prefixed with /api/staff

export default app;

if (!process.env.ELECTRON) {
  app.listen(PORT, () => console.log('XianFire running at http://localhost:' + PORT));
}
