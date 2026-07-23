const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const { connectDB } = require('./db');
const { syncDB, User } = require('./models');
const routes = require('./routes');

const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// Allow requests from any origin (React dev server on 5173 and production)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// API route namespace
app.use('/api', routes);

// Global error handling middleware to capture and log any 500 errors
app.use((err, req, res, next) => {
  console.error('🔥 [SERVER 500 ERROR]', req.method, req.url, ':', err);
  res.status(500).json({
    message: 'Internal Server Error',
    error: err.message || err.toString(),
    path: req.url
  });
});

// ── SERVE REACT FRONTEND (Production / Render) ──────────────────────────────
const clientBuildPath = path.join(__dirname, '..', 'client', 'dist');
if (require('fs').existsSync(clientBuildPath)) {
  // Serve built React app static files
  app.use(express.static(clientBuildPath));

  // SPA fallback: send index.html for all non-API routes
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(clientBuildPath, 'index.html'));
    }
  });
  console.log('✅ Serving React build from', clientBuildPath);
} else {
  // Development-only root response
  app.get('/', (req, res) => {
    res.json({
      app: 'Alinda Digital Learners Backend',
      status: 'Running',
      database: process.env.DB_TYPE || 'sqlite',
      note: 'Run `npm run build` in client/ to serve the frontend.'
    });
  });
}


// ==========================================
// AUTO-SEED: Create default admin if no users exist
// ==========================================
async function seedDefaultAdmin() {
  try {
    const existingAdmin = await User.findOne({ username: 'admin' });
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await User.create({
        name: 'School Administrator',
        phone: '256700000000',
        username: 'admin',
        password: hashedPassword,
        role: 'admin',
        isApproved: true,
        profile: 'System Administrator',
        level: null
      });
      console.log('');
      console.log('========================================');
      console.log('  DEFAULT ADMIN ACCOUNT CREATED:');
      console.log('  Username : admin');
      console.log('  Password : admin123');
      console.log('  >> CHANGE THIS PASSWORD AFTER FIRST LOGIN <<');
      console.log('========================================');
      console.log('');
    } else {
      console.log('Admin account already exists. Skipping seed.');
    }
  } catch (err) {
    console.error('Admin seed error (non-fatal):', err.message);
  }
}

async function startServer() {
  try {
    // 1. Establish database connection (PostgreSQL, MongoDB or fallback SQLite)
    const dbConfig = await connectDB();
    
    // 2. Synchronize database models / schemas
    await syncDB();
    console.log(`Database tables synchronized successfully for dialect: ${dbConfig.type}.`);

    // 3. Seed default admin account if first run
    await seedDefaultAdmin();

    // 4. Listen for requests (Explicitly binding to 0.0.0.0 for Render port detection)
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`Alinda Digital Learners API running on port ${PORT}`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`⚠️ Port ${PORT} is already in use by another running process.`);
      } else {
        console.error('Server startup error:', err);
      }
    });
  } catch (err) {
    console.error('Fatal error starting the backend server:', err);
    process.exit(1);
  }
}

startServer();
