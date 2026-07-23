const { Sequelize } = require('sequelize');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const dbType = process.env.DB_TYPE || 'sqlite';
let sequelize = null;
let mongoConnection = null;

async function connectDB() {
  if (dbType === 'mongodb') {
    try {
      const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/alinda_school';
      console.log(`Connecting to MongoDB at: ${mongoUri}`);
      mongoConnection = await mongoose.connect(mongoUri);
      console.log('MongoDB connection successful.');
      return { type: 'mongodb', connection: mongoConnection };
    } catch (err) {
      console.error('MongoDB connection failed. Falling back to local SQLite...', err);
      // Fallback
      process.env.DB_TYPE = 'sqlite';
      return connectSQL();
    }
  } else {
    return connectSQL();
  }
}

function connectSQL() {
  const isPostgres = dbType === 'postgres';
  if (isPostgres) {
    const pgUri = process.env.PG_URI || 'postgres://postgres:password@localhost:5432/alinda_school';
    console.log(`Connecting to PostgreSQL at: ${pgUri}`);
    sequelize = new Sequelize(pgUri, {
      logging: false,
      dialect: 'postgres',
    });
  } else {
    console.log('Connecting to Local SQLite Database...');
    sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: path.join(__dirname, 'db.sqlite'),
      logging: false,
    });
  }
  return { type: isPostgres ? 'postgres' : 'sqlite', connection: sequelize };
}

function getSequelize() {
  return sequelize;
}

module.exports = {
  connectDB,
  getSequelize,
  dbType: () => process.env.DB_TYPE || 'sqlite'
};
