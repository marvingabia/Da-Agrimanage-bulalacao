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
    
import express from "express";
import path from "path";
import session from "express-session";
import router from "./routes/index.js";
import fs from 'fs';
import hbs from "hbs";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { initDatabase } from "./config/database.js";
import passport from "./config/passport.js";
import { configurePassport } from "./config/passport.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize MySQL Database Connection (with fallback)
try {
    await initDatabase();
    console.log('✅ MySQL database initialized successfully');
} catch (error) {
    console.log('⚠️  MySQL not available, running in fallback mode');
    console.log('💡 Start Laragon and run: npm run migrate');
    console.log('📝 System will use local storage for now');
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(process.cwd(), "public")));

// Session configuration for Vercel serverless
app.use(session({
  secret: process.env.SESSION_SECRET || "xianfire-secret-key-change-in-production",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax'
  },
  // For Vercel, we need to trust the proxy
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
fs.readdir(partialsDir, (err, files) => {
  if (err) {
    console.error("❌ Could not read partials directory:", err);
    return;
  }

   files
    .filter(file => file.endsWith('.xian'))
    .forEach(file => {
      const partialName = file.replace('.xian', ''); 
      const fullPath = path.join(partialsDir, file);

      fs.readFile(fullPath, 'utf8', (err, content) => {
        if (err) {
          console.error(`❌ Failed to read partial: ${file}`, err);
          return;
        }
        hbs.registerPartial(partialName, content);
        
      });
    });
});

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
