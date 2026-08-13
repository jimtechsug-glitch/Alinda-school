const { DataTypes } = require('sequelize');
const mongoose = require('mongoose');

// Ensure MongoDB schemas serialize `_id` to `id` for frontend compatibility
mongoose.plugin((schema) => {
  schema.set('toJSON', {
    virtuals: true,
    transform: (doc, ret) => {
      ret.id = ret._id ? ret._id.toString() : (ret.id || (doc._id ? doc._id.toString() : undefined));
      delete ret._id;
      delete ret.__v;
    }
  });
  schema.set('toObject', {
    virtuals: true,
    transform: (doc, ret) => {
      ret.id = ret._id ? ret._id.toString() : (ret.id || (doc._id ? doc._id.toString() : undefined));
      delete ret._id;
      delete ret.__v;
    }
  });
});

const { getSequelize, dbType } = require('./db');

// ==========================================
// 1. SEQUELIZE DEFINITIONS (SQL: Postgres/SQLite)
// ==========================================
let SQL = {};

function initSequelizeModels() {
  const sequelize = getSequelize();
  if (!sequelize) return;

  SQL.User = sequelize.define('User', {
    name: { type: DataTypes.STRING, allowNull: false },
    phone: { type: DataTypes.STRING, allowNull: false },
    username: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.STRING, allowNull: false }, // superadmin, admin, teacher, student, guest
    isApproved: { type: DataTypes.BOOLEAN, defaultValue: false },
    isSuspended: { type: DataTypes.BOOLEAN, defaultValue: false }, // Admin can suspend accounts
    level: { type: DataTypes.STRING, allowNull: true }, // e.g., P5, S3, S6
    assignedTeacherId: { type: DataTypes.INTEGER, allowNull: true },
    profile: { type: DataTypes.TEXT, allowNull: true }, // bio/subjects taught
    combination: { type: DataTypes.STRING, allowNull: true }, // For A-Level S5/S6 students (e.g. PCM, HEG)
    principalSubjects: { type: DataTypes.TEXT, allowNull: true }, // JSON array of 3 principal subject IDs
    subsidiarySubjects: { type: DataTypes.TEXT, allowNull: true }, // JSON array of 2 subsidiary subject IDs (includes GP)
    photoData: { type: DataTypes.TEXT, allowNull: true }, // base64 representation of profile photo
    tenantId: { type: DataTypes.STRING, allowNull: true }, // ID of the school platform
  });

  SQL.Subject = sequelize.define('Subject', {
    name: { type: DataTypes.STRING, allowNull: false },
    level: { type: DataTypes.STRING, allowNull: false }, // Primary, O-Level, A-Level
    className: { type: DataTypes.STRING, allowNull: false }, // P1-P7, S1-S6
    description: { type: DataTypes.TEXT, allowNull: true },
    category: { type: DataTypes.STRING, defaultValue: 'Both', allowNull: true }, // Art, Science, Both
    code: { type: DataTypes.STRING, allowNull: true }, // Subject code
    classification: { type: DataTypes.STRING, allowNull: true }, // Compulsory, Optional, Principal, Subsidiary
    tenantId: { type: DataTypes.STRING, allowNull: true },
  });

  SQL.Material = sequelize.define('Material', {
    title: { type: DataTypes.STRING, allowNull: false },
    type: { type: DataTypes.STRING, allowNull: false }, // notes, support
    contentUrl: { type: DataTypes.TEXT, allowNull: true },
    subjectId: { type: DataTypes.INTEGER, allowNull: false },
    teacherId: { type: DataTypes.INTEGER, allowNull: false },
    classLevel: { type: DataTypes.STRING, allowNull: true }, // Filter to specific class (e.g. P5, S5)
    combination: { type: DataTypes.STRING, allowNull: true }, // A-Level Combination filtering (e.g. PCM)
    fileName: { type: DataTypes.STRING, allowNull: true }, // Client's chosen filename
    fileType: { type: DataTypes.STRING, allowNull: true }, // File type (pdf, word, image, video)
    fileData: { type: DataTypes.TEXT, allowNull: true }, // Base64 representation of the uploaded file
    isBlocked: { type: DataTypes.BOOLEAN, defaultValue: false }, // Admin can block material from students
    tenantId: { type: DataTypes.STRING, allowNull: true },
  });

  SQL.Activity = sequelize.define('Activity', {
    title: { type: DataTypes.STRING, allowNull: false },
    instructions: { type: DataTypes.TEXT, allowNull: false },
    levelType: { type: DataTypes.STRING, allowNull: false }, // Primary, O-Level, A-Level
    maxScore: { type: DataTypes.INTEGER, defaultValue: 100 }, // For Primary/A-level (100) or NLSC (3)
    subjectId: { type: DataTypes.INTEGER, allowNull: false },
    teacherId: { type: DataTypes.INTEGER, allowNull: false },
    classLevel: { type: DataTypes.STRING, allowNull: true }, // Target class (e.g. P5, S3, S6)
    combination: { type: DataTypes.STRING, allowNull: true }, // A-Level combination filter (e.g. PCM)
    fileName: { type: DataTypes.STRING, allowNull: true }, // Attached file name
    fileType: { type: DataTypes.STRING, allowNull: true }, // pdf, doc, etc.
    fileData: { type: DataTypes.TEXT, allowNull: true },   // Base64 file content
    isBlocked: { type: DataTypes.BOOLEAN, defaultValue: false }, // Admin can block activity from students
    tenantId: { type: DataTypes.STRING, allowNull: true },
  });

  SQL.Submission = sequelize.define('Submission', {
    activityId: { type: DataTypes.INTEGER, allowNull: false },
    studentId: { type: DataTypes.INTEGER, allowNull: false },
    studentAnswer: { type: DataTypes.TEXT, allowNull: true, defaultValue: '' },
    fileName: { type: DataTypes.STRING, allowNull: true },
    fileType: { type: DataTypes.STRING, allowNull: true },
    fileData: { type: DataTypes.TEXT, allowNull: true },
    score: { type: DataTypes.FLOAT, allowNull: true }, // 1,2,3 for NLSC, or percentage for primary/A-Level
    feedback: { type: DataTypes.TEXT, allowNull: true },
    isMarked: { type: DataTypes.BOOLEAN, defaultValue: false },
    markedAt: { type: DataTypes.DATE, allowNull: true },
    tenantId: { type: DataTypes.STRING, allowNull: true },
  });

  SQL.Lesson = sequelize.define('Lesson', {
    title: { type: DataTypes.STRING, allowNull: false },
    scheduleTime: { type: DataTypes.STRING, allowNull: false },
    meetUrl: { type: DataTypes.STRING, allowNull: false },
    subjectId: { type: DataTypes.INTEGER, allowNull: false },
    level: { type: DataTypes.STRING, allowNull: false }, // P5, S3
    teacherId: { type: DataTypes.INTEGER, allowNull: false },
    tenantId: { type: DataTypes.STRING, allowNull: true },
  });

  SQL.Feedback = sequelize.define('Feedback', {
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false },
  });

  SQL.ChatbotResponse = sequelize.define('ChatbotResponse', {
    keyword: { type: DataTypes.STRING, allowNull: false, unique: true },
    response: { type: DataTypes.TEXT, allowNull: false },
  });

  SQL.Combination = sequelize.define('Combination', {
    code: { type: DataTypes.STRING, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    subjectIds: { type: DataTypes.TEXT, allowNull: false }, // JSON array of subject IDs
    tenantId: { type: DataTypes.STRING, allowNull: true },
  });

  SQL.Tenant = sequelize.define('Tenant', {
    name: { type: DataTypes.STRING, allowNull: false },
    inviteCode: { type: DataTypes.STRING, allowNull: false, unique: true },
    trialStartDate: { type: DataTypes.DATE, allowNull: false },
    trialEndDate: { type: DataTypes.DATE, allowNull: false },
    status: { type: DataTypes.STRING, defaultValue: 'active' }, // active, expired, suspended
    revenueGenerated: { type: DataTypes.FLOAT, defaultValue: 0 },
  });

  SQL.ActivationKey = sequelize.define('ActivationKey', {
    key: { type: DataTypes.STRING, allowNull: false, unique: true },
    tenantId: { type: DataTypes.STRING, allowNull: true },
    durationDays: { type: DataTypes.INTEGER, defaultValue: 90 }, // One term approx 90 days
    price: { type: DataTypes.FLOAT, defaultValue: 500000 },
    isUsed: { type: DataTypes.BOOLEAN, defaultValue: false },
  });
}

// ==========================================
// 2. MONGOOSE SCHEMA DEFINITIONS (MongoDB)
// ==========================================
const Mongo = {};

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true },
  isApproved: { type: Boolean, default: false },
  isSuspended: { type: Boolean, default: false }, // Admin can suspend accounts
  level: { type: String },
  assignedTeacherId: { type: String },
  profile: { type: String },
  combination: { type: String }, // S5/S6 A-Level Combination (e.g. PCM, HEG)
  principalSubjects: { type: String }, // JSON array of 3 principal subject IDs
  subsidiarySubjects: { type: String }, // JSON array of 2 subsidiary subject IDs (includes GP)
  photoData: { type: String }, // base64 profile picture string
  tenantId: { type: String }, // ID of the school platform
}, { timestamps: true });

const SubjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  level: { type: String, required: true },
  className: { type: String, required: true },
  description: { type: String },
  category: { type: String, default: 'Both' }, // Art, Science, Both
  code: { type: String },
  classification: { type: String }, // Compulsory, Optional, Principal, Subsidiary
  tenantId: { type: String },
}, { timestamps: true });

const MaterialSchema = new mongoose.Schema({
  title: { type: String, required: true },
  type: { type: String, required: true },
  contentUrl: { type: String },
  subjectId: { type: String, required: true },
  teacherId: { type: String, required: true },
  classLevel: { type: String }, // P5, S5, etc.
  combination: { type: String }, // PCM, HEG, etc.
  fileName: { type: String }, // Original file name
  fileType: { type: String }, // File extension/type
  fileData: { type: String }, // Base64 raw content
  isBlocked: { type: Boolean, default: false }, // Admin can block material from students
  tenantId: { type: String },
}, { timestamps: true });

const ActivitySchema = new mongoose.Schema({
  title: { type: String, required: true },
  instructions: { type: String, required: true },
  levelType: { type: String, required: true },
  maxScore: { type: Number, default: 100 },
  subjectId: { type: String, required: true },
  teacherId: { type: String, required: true },
  classLevel: { type: String }, // Target class level (P5, S3, S6, etc.)
  combination: { type: String }, // A-Level combination (PCM, HEG, etc.)
  fileName: { type: String }, // Attached file name
  fileType: { type: String }, // File extension
  fileData: { type: String }, // Base64 file content
  isBlocked: { type: Boolean, default: false }, // Admin can block activity from students
  tenantId: { type: String },
}, { timestamps: true });

const SubmissionSchema = new mongoose.Schema({
  activityId: { type: String, required: true },
  studentId: { type: String, required: true },
  studentAnswer: { type: String, default: '' },
  fileName: { type: String },
  fileType: { type: String },
  fileData: { type: String },
  score: { type: Number },
  feedback: { type: String },
  isMarked: { type: Boolean, default: false },
  markedAt: { type: Date },
  tenantId: { type: String },
}, { timestamps: true });

const LessonSchema = new mongoose.Schema({
  title: { type: String, required: true },
  scheduleTime: { type: String, required: true },
  meetUrl: { type: String, required: true },
  subjectId: { type: String, required: true },
  level: { type: String, required: true },
  teacherId: { type: String, required: true },
  tenantId: { type: String },
}, { timestamps: true });

const FeedbackSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  message: { type: String, required: true },
}, { timestamps: true });

const ChatbotResponseSchema = new mongoose.Schema({
  keyword: { type: String, required: true, unique: true },
  response: { type: String, required: true },
}, { timestamps: true });

const CombinationSchema = new mongoose.Schema({
  code: { type: String, required: true },
  name: { type: String, required: true },
  subjectIds: { type: String, required: true }, // JSON array of subject IDs
  tenantId: { type: String },
}, { timestamps: true });

const TenantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  inviteCode: { type: String, required: true, unique: true },
  trialStartDate: { type: Date, required: true },
  trialEndDate: { type: Date, required: true },
  status: { type: String, default: 'active' }, // active, expired, suspended
  revenueGenerated: { type: Number, default: 0 },
}, { timestamps: true });

const ActivationKeySchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  tenantId: { type: String }, // null if unused
  durationDays: { type: Number, default: 90 }, // One term approx 90 days
  price: { type: Number, default: 500000 },
  isUsed: { type: Boolean, default: false },
}, { timestamps: true });

function initMongooseModels() {
  Mongo.User = mongoose.models.User || mongoose.model('User', UserSchema);
  Mongo.Subject = mongoose.models.Subject || mongoose.model('Subject', SubjectSchema);
  Mongo.Material = mongoose.models.Material || mongoose.model('Material', MaterialSchema);
  Mongo.Activity = mongoose.models.Activity || mongoose.model('Activity', ActivitySchema);
  Mongo.Submission = mongoose.models.Submission || mongoose.model('Submission', SubmissionSchema);
  Mongo.Lesson = mongoose.models.Lesson || mongoose.model('Lesson', LessonSchema);
  Mongo.Feedback = mongoose.models.Feedback || mongoose.model('Feedback', FeedbackSchema);
  Mongo.ChatbotResponse = mongoose.models.ChatbotResponse || mongoose.model('ChatbotResponse', ChatbotResponseSchema);
  Mongo.Combination = mongoose.models.Combination || mongoose.model('Combination', CombinationSchema);
  Mongo.Tenant = mongoose.models.Tenant || mongoose.model('Tenant', TenantSchema);
  Mongo.ActivationKey = mongoose.models.ActivationKey || mongoose.model('ActivationKey', ActivationKeySchema);
}

// ==========================================
// 3. UNIFIED DATABASE LAYER
// ==========================================
function syncDB() {
  const type = dbType();
  if (type === 'mongodb') {
    initMongooseModels();
  } else {
    initSequelizeModels();
    // Sync SQLite/Postgres tables
    return getSequelize().sync();
  }
}

// Custom wrapper logic to expose a single unified interface
function getModel(name) {
  const type = dbType();
  if (type === 'mongodb') {
    if (!Mongo[name]) initMongooseModels();
    return Mongo[name];
  } else {
    if (!SQL[name]) initSequelizeModels();
    return SQL[name];
  }
}

function toPlain(doc) {
  if (!doc) return null;
  if (Array.isArray(doc)) return doc.map(toPlain);
  if (typeof doc.toJSON === 'function') {
    const json = doc.toJSON();
    if (json._id && !json.id) json.id = json._id.toString();
    if (!json.id && doc._id) json.id = doc._id.toString();
    return json;
  }
  if (doc._id && !doc.id) {
    return { ...doc, id: doc._id.toString() };
  }
  return doc;
}

function normalizeMongoQuery(query = {}) {
  if (!query || typeof query !== 'object') return query;
  const clean = { ...query };
  if (clean.id !== undefined) {
    clean._id = clean.id;
    delete clean.id;
  }
  return clean;
}

function createModelWrapper(name) {
  return {
    findOne: async (query = {}) => {
      const model = getModel(name);
      if (dbType() === 'mongodb') {
        const doc = await model.findOne(normalizeMongoQuery(query));
        return toPlain(doc);
      } else {
        const res = await model.findOne({ where: query });
        return res ? res.toJSON() : null;
      }
    },
    findById: async (id) => {
      const model = getModel(name);
      if (dbType() === 'mongodb') {
        if (!id) return null;
        try {
          const doc = await model.findById(id);
          return toPlain(doc);
        } catch (err) {
          const doc = await model.findOne({ _id: id }).catch(() => null);
          return toPlain(doc);
        }
      } else {
        const res = await model.findByPk(id);
        return res ? res.toJSON() : null;
      }
    },
    create: async (data) => {
      const model = getModel(name);
      if (dbType() === 'mongodb') {
        const doc = await model.create(data);
        return toPlain(doc);
      } else {
        const res = await model.create(data);
        return res.toJSON();
      }
    },
    findAll: async (query = {}) => {
      const model = getModel(name);
      if (dbType() === 'mongodb') {
        const docs = await model.find(normalizeMongoQuery(query));
        return docs.map(toPlain);
      } else {
        const res = await model.findAll({ where: query });
        return res.map(r => r.toJSON());
      }
    },
    update: async (id, data) => {
      const model = getModel(name);
      if (dbType() === 'mongodb') {
        if (!id) return null;
        const doc = await model.findByIdAndUpdate(id, data, { new: true });
        return toPlain(doc);
      } else {
        await model.update(data, { where: { id } });
        const updated = await model.findByPk(id);
        return updated ? updated.toJSON() : null;
      }
    },
    delete: async (id) => {
      const model = getModel(name);
      if (dbType() === 'mongodb') {
        if (!id) return null;
        return await model.findByIdAndDelete(id);
      } else {
        return await model.destroy({ where: { id } });
      }
    }
  };
}

const User = createModelWrapper('User');
const Subject = createModelWrapper('Subject');
const Material = createModelWrapper('Material');
const Activity = createModelWrapper('Activity');
const Submission = createModelWrapper('Submission');
const Lesson = createModelWrapper('Lesson');
const Feedback = createModelWrapper('Feedback');
const ChatbotResponse = createModelWrapper('ChatbotResponse');
const Combination = createModelWrapper('Combination');
const Tenant = createModelWrapper('Tenant');
const ActivationKey = createModelWrapper('ActivationKey');

module.exports = {
  syncDB,
  User,
  Subject,
  Material,
  Activity,
  Submission,
  Lesson,
  Feedback,
  ChatbotResponse,
  Combination,
  Tenant,
  ActivationKey
};
