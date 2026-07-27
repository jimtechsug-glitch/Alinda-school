const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const { User, Subject, Material, Activity, Submission, Lesson, Feedback, ChatbotResponse, Combination, Tenant, ActivationKey } = require('./models');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'alinda_digital_learners_secret_key_2026';

// ==========================================
// MIDDLEWARES
// ==========================================
function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Access Denied: No Token Provided' });

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(403).json({ message: 'Invalid Token' });
  }
}

const requireRole = (roles) => (req, res, next) => {
  verifyToken(req, res, () => {
    if (roles.includes(req.user.role) || req.user.role === 'superadmin') {
      next();
    } else {
      res.status(403).json({ message: 'Unauthorized access: insufficient permissions' });
    }
  });
};

// ==========================================
// 1. AUTHENTICATION & PORTALS
// ==========================================

// Register User
router.post('/auth/register', async (req, res) => {
  try {
    const { name, phone, username, password, role, level, combination, principalSubjects, subsidiarySubjects, inviteCode } = req.body;
    if (!name || !phone || !username || !password || !role) {
      return res.status(400).json({ message: 'Please enter all fields' });
    }

    if (role === 'teacher' || role === 'admin' || role === 'superadmin') {
      return res.status(403).json({ message: 'Only students can self-register. Staff must be added by administrators.' });
    }

    if (role === 'student' && !inviteCode) {
      return res.status(400).json({ message: 'Invite code is required' });
    }

    const { Tenant } = require('./models');
    let tenantId = null;
    if (role === 'student') {
      const tenant = await Tenant.findOne({ inviteCode });
      if (!tenant) return res.status(400).json({ message: 'Invalid invite code' });
      tenantId = tenant.id;
    }

    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const isApproved = false; // Students must be approved by school admin

    const user = await User.create({
      name,
      phone,
      username,
      password: hashedPassword,
      role,
      level,
      combination, // Save A-Level combination (e.g. PCM, BCM)
      isApproved,
      profile: '',
      principalSubjects: typeof principalSubjects === 'string' ? principalSubjects : JSON.stringify(principalSubjects),
      subsidiarySubjects: typeof subsidiarySubjects === 'string' ? subsidiarySubjects : JSON.stringify(subsidiarySubjects),
      tenantId
    });

    res.status(201).json({
      message: 'Registration pending school admin approval.',
      user: { id: user.id, username: user.username, role: user.role, isApproved: user.isApproved }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error during registration', error: err.message });
  }
});

// Login User
router.post('/auth/login', async (req, res) => {
  try {
    const { loginKey, password } = req.body; // Can be username or phone number
    if (!loginKey || !password) {
      return res.status(400).json({ message: 'Please fill in all fields' });
    }

    let user = await User.findOne({ username: loginKey });
    if (!user) user = await User.findOne({ phone: loginKey });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    if (!user.isApproved) {
      return res.status(403).json({ message: 'Your account is pending administrator approval.' });
    }
    if (user.isSuspended) {
      return res.status(403).json({ message: 'Your account has been suspended. Please contact the administrator.' });
    }

    const { Tenant } = require('./models');
    if (user.role !== 'superadmin' && user.tenantId) {
      const tenant = await Tenant.findById(user.tenantId);
      if (tenant) {
        if (tenant.status === 'suspended') {
          return res.status(403).json({ message: 'Your school platform has been suspended.' });
        }
        if (tenant.trialEndDate && new Date() > new Date(tenant.trialEndDate)) {
          if (tenant.status !== 'expired') {
            await Tenant.update(tenant.id, { status: 'expired' });
            tenant.status = 'expired';
          }
        }
        if (tenant.status === 'expired' && user.role !== 'admin') {
          return res.status(403).json({ message: 'Your school platform subscription has expired. Please contact your school administrator.' });
        }
      }
    }

    const token = jwt.sign({ 
      id: user.id, 
      username: user.username, 
      role: user.role, 
      name: user.name, 
      level: user.level,
      combination: user.combination,
      tenantId: user.tenantId 
    }, JWT_SECRET, { expiresIn: '1d' });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        level: user.level,
        combination: user.combination,
        phone: user.phone,
        assignedTeacherId: user.assignedTeacherId,
        profile: user.profile,
        photoData: user.photoData,
        tenantId: user.tenantId
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Login server error', error: err.message });
  }
});

// Edit Profile (Teachers and Students)
router.put('/auth/profile', requireRole(['teacher', 'student']), async (req, res) => {
  try {
    const { name, phone, profile, photoData } = req.body;
    const updateObj = {};
    if (name !== undefined) updateObj.name = name;
    if (phone !== undefined) updateObj.phone = phone;
    if (profile !== undefined) updateObj.profile = profile;
    if (photoData !== undefined) updateObj.photoData = photoData;

    const updated = await User.update(req.user.id, updateObj);
    res.json({ message: 'Profile updated successfully', user: updated });
  } catch (err) {
    res.status(500).json({ message: 'Profile update failed', error: err.message });
  }
});

// Change Password (All Authenticated Users)
router.put('/auth/change-password', verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long' });
    }
    if (confirmPassword !== undefined && newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'New password and confirmation do not match' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User account not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect current password' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.update(user.id, { password: hashedPassword });

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Password change failed', error: err.message });
  }
});

// ==========================================
// SUPER-ADMIN MANAGEMENT
// ==========================================

// Get all tenants (Superadmin)
router.get('/superadmin/tenants', requireRole(['superadmin']), async (req, res) => {
  try {
    const tenants = await Tenant.findAll({});
    res.json(tenants);
  } catch (err) {
    res.status(500).json({ message: 'Failed to retrieve tenants', error: err.message });
  }
});

// Create a new Tenant/School (Superadmin)
router.post('/superadmin/tenants', requireRole(['superadmin']), async (req, res) => {
  try {
    const { name, trialDays = 14 } = req.body;
    if (!name) return res.status(400).json({ message: 'School name is required' });

    // Generate unique invite code
    const inviteCode = name.substring(0, 3).toUpperCase() + Math.floor(1000 + Math.random() * 9000);
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + trialDays);

    const tenant = await Tenant.create({
      name,
      inviteCode,
      trialStartDate: startDate,
      trialEndDate: endDate,
      status: 'active',
      revenueGenerated: 0
    });

    // Auto-seed subjects from default school
    try {
      const defaultTenant = await Tenant.findOne({ where: { inviteCode: 'DEFAULT' } }).catch(() => null);
      const defaultTenantId = defaultTenant ? String(defaultTenant.id) : null;
      
      let defaultSubjects = [];
      if (defaultTenantId) {
        defaultSubjects = await Subject.findAll({ where: { tenantId: defaultTenantId } });
      }
      if (!defaultSubjects || defaultSubjects.length === 0) {
        defaultSubjects = await Subject.findAll({ where: { tenantId: null } });
      }

      if (defaultSubjects && defaultSubjects.length > 0) {
        const clonedSubjects = defaultSubjects.map(sub => ({
          name: sub.name,
          level: sub.level,
          className: sub.className,
          description: sub.description,
          category: sub.category || 'Both',
          code: sub.code,
          classification: sub.classification,
          tenantId: String(tenant.id)
        }));
        await Subject.bulkCreate(clonedSubjects);
      }
    } catch (seedErr) {
      console.error('Error auto-seeding subjects:', seedErr.message);
    }

    res.status(201).json({ message: 'School Platform created and subjects auto-seeded', tenant });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create tenant', error: err.message });
  }
});

// Update Tenant (Superadmin)
router.put('/superadmin/tenants/:id', requireRole(['superadmin']), async (req, res) => {
  try {
    const { name, status, trialDays } = req.body;
    let tenant = await Tenant.findByPk ? await Tenant.findByPk(req.params.id) : await Tenant.findOne({ where: { id: req.params.id } });
    if (!tenant && Tenant.findById) tenant = await Tenant.findById(req.params.id);
    if (!tenant) return res.status(404).json({ message: 'School Platform not found' });

    if (name) tenant.name = name;
    if (status) tenant.status = status;
    if (trialDays) {
      const currentEnd = new Date(tenant.trialEndDate || Date.now());
      currentEnd.setDate(currentEnd.getDate() + Number(trialDays));
      tenant.trialEndDate = currentEnd;
    }
    await tenant.save();
    res.json({ message: 'School Platform updated successfully', tenant });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update tenant', error: err.message });
  }
});

// Suspend/Unsuspend Tenant (Superadmin)
router.put('/superadmin/tenants/:id/suspend', requireRole(['superadmin']), async (req, res) => {
  try {
    let tenant = await Tenant.findByPk ? await Tenant.findByPk(req.params.id) : await Tenant.findOne({ where: { id: req.params.id } });
    if (!tenant && Tenant.findById) tenant = await Tenant.findById(req.params.id);
    if (!tenant) return res.status(404).json({ message: 'School Platform not found' });

    tenant.status = tenant.status === 'suspended' ? 'active' : 'suspended';
    await tenant.save();
    res.json({ message: `School Platform state changed to ${tenant.status}`, tenant });
  } catch (err) {
    res.status(500).json({ message: 'Failed to toggle tenant suspension', error: err.message });
  }
});

// Delete Tenant (Superadmin)
router.delete('/superadmin/tenants/:id', requireRole(['superadmin']), async (req, res) => {
  try {
    let tenant = await Tenant.findByPk ? await Tenant.findByPk(req.params.id) : await Tenant.findOne({ where: { id: req.params.id } });
    if (!tenant && Tenant.findById) tenant = await Tenant.findById(req.params.id);
    if (!tenant) return res.status(404).json({ message: 'School Platform not found' });

    await tenant.destroy();
    res.json({ message: 'School Platform deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete tenant', error: err.message });
  }
});

// Create School Admin for a Tenant (Superadmin)
router.post('/superadmin/tenants/:id/admin', requireRole(['superadmin']), async (req, res) => {
  try {
    const { name, phone, username, password } = req.body;
    const tenantId = req.params.id;
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) return res.status(404).json({ message: 'School Platform not found' });

    const existing = await User.findOne({ username });
    if (existing) return res.status(400).json({ message: 'Username already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const adminUser = await User.create({
      name,
      phone,
      username,
      password: hashedPassword,
      role: 'admin',
      isApproved: true,
      tenantId,
      profile: 'School Administrator'
    });

    res.status(201).json({ message: 'School Admin created successfully', user: adminUser });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create school admin', error: err.message });
  }
});

// Generate Activation Key (Superadmin)
router.post('/superadmin/activation-keys', requireRole(['superadmin']), async (req, res) => {
  try {
    const { durationDays = 90, price = 500000, count = 1 } = req.body;
    const keys = [];
    for (let i = 0; i < count; i++) {
      const keyString = 'ALINDA-' + Math.random().toString(36).substring(2, 10).toUpperCase();
      const key = await ActivationKey.create({
        key: keyString,
        durationDays,
        price,
        isUsed: false
      });
      keys.push(key);
    }
    res.status(201).json({ message: `${count} activation keys generated`, keys });
  } catch (err) {
    res.status(500).json({ message: 'Failed to generate keys', error: err.message });
  }
});

// Get Activation Keys (Superadmin)
router.get('/superadmin/activation-keys', requireRole(['superadmin']), async (req, res) => {
  try {
    const keys = await ActivationKey.findAll({});
    res.json(keys);
  } catch (err) {
    res.status(500).json({ message: 'Failed to retrieve keys', error: err.message });
  }
});

// Apply Activation Key (School Admin)
router.post('/admin/apply-key', requireRole(['admin']), async (req, res) => {
  try {
    const { key } = req.body;
    if (!key) return res.status(400).json({ message: 'Activation key is required' });
    
    const activationKey = await ActivationKey.findOne({ key, isUsed: false });
    if (!activationKey) return res.status(400).json({ message: 'Invalid or already used activation key' });
    
    const tenant = await Tenant.findById(req.user.tenantId);
    if (!tenant) return res.status(404).json({ message: 'Tenant not found' });
    
    let newEndDate = new Date();
    if (tenant.trialEndDate && new Date(tenant.trialEndDate) > new Date()) {
       newEndDate = new Date(tenant.trialEndDate);
    }
    newEndDate.setDate(newEndDate.getDate() + activationKey.durationDays);
    
    await Tenant.update(tenant.id, { 
      trialEndDate: newEndDate, 
      status: 'active',
      revenueGenerated: tenant.revenueGenerated + activationKey.price
    });
    
    await ActivationKey.update(activationKey.id, {
       isUsed: true,
       tenantId: tenant.id
    });
    
    res.json({ message: 'Activation key applied successfully! School subscription extended.', newEndDate });
  } catch (err) {
    res.status(500).json({ message: 'Failed to apply key', error: err.message });
  }
});

// Create Teacher (School Admin)
router.post('/admin/teachers', requireRole(['admin']), async (req, res) => {
  try {
    const { name, phone, username, password, profile } = req.body;
    const existing = await User.findOne({ username });
    if (existing) return res.status(400).json({ message: 'Username already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const teacher = await User.create({
      name,
      phone,
      username,
      password: hashedPassword,
      role: 'teacher',
      isApproved: true,
      tenantId: req.user.tenantId,
      profile: profile || 'Facilitator'
    });
    res.status(201).json({ message: 'Teacher created successfully', teacher });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create teacher', error: err.message });
  }
});

// ==========================================
// ADMIN USER MANAGEMENT
// ==========================================

// Get All Users (Admin & SuperAdmin)
router.get('/admin/users', requireRole(['admin']), async (req, res) => {
  try {
    let query = {};
    if (req.user.role !== 'superadmin') {
      query.tenantId = req.user.tenantId;
    }
    const users = await User.findAll(query);
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Failed to retrieve users', error: err.message });
  }
});

// Approve Student (Admin)
router.put('/admin/approve-student/:id', requireRole(['admin']), async (req, res) => {
  try {
    const student = await User.findById(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const updated = await User.update(req.params.id, { isApproved: true });
    res.json({ message: 'Student registration approved successfully', user: updated });
  } catch (err) {
    res.status(500).json({ message: 'Approval failed', error: err.message });
  }
});

// Assign Student to Teacher (Admin)
router.put('/admin/assign-teacher', requireRole(['admin']), async (req, res) => {
  try {
    const { studentId, teacherId } = req.body;
    if (!studentId || !teacherId) return res.status(400).json({ message: 'Student ID and Teacher ID are required' });

    const updated = await User.update(studentId, { assignedTeacherId: teacherId });
    res.json({ message: 'Student successfully assigned to teacher', student: updated });
  } catch (err) {
    res.status(500).json({ message: 'Assignment failed', error: err.message });
  }
});

// Edit User (Admin) — update name, phone, profile, level, combination, principalSubjects, subsidiarySubjects, or reset password
router.put('/admin/users/:id', requireRole(['admin']), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { name, phone, profile, level, combination, principalSubjects, subsidiarySubjects, password } = req.body;
    const updateObj = {
      name: name || user.name,
      phone: phone || user.phone,
      profile: profile !== undefined ? profile : user.profile,
      level: level !== undefined ? level : user.level,
      combination: combination !== undefined ? combination : user.combination,
      principalSubjects: principalSubjects !== undefined ? (typeof principalSubjects === 'string' ? principalSubjects : JSON.stringify(principalSubjects)) : user.principalSubjects,
      subsidiarySubjects: subsidiarySubjects !== undefined ? (typeof subsidiarySubjects === 'string' ? subsidiarySubjects : JSON.stringify(subsidiarySubjects)) : user.subsidiarySubjects,
    };

    if (password && password.trim().length >= 6) {
      updateObj.password = await bcrypt.hash(password.trim(), 10);
    }

    const updated = await User.update(req.params.id, updateObj);
    res.json({ message: 'User updated successfully', user: updated });
  } catch (err) {
    res.status(500).json({ message: 'User update failed', error: err.message });
  }
});

// Delete User (Admin)
router.delete('/admin/users/:id', requireRole(['admin']), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin') return res.status(403).json({ message: 'Cannot delete an admin account' });

    await User.delete(req.params.id);
    res.json({ message: `${user.role === 'teacher' ? 'Teacher' : 'Student'} account deleted successfully` });
  } catch (err) {
    res.status(500).json({ message: 'User deletion failed', error: err.message });
  }
});

// Suspend / Unsuspend User (Admin)
router.put('/admin/users/:id/suspend', requireRole(['admin']), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin') return res.status(403).json({ message: 'Cannot suspend an admin account' });

    const newStatus = !user.isSuspended;
    const updated = await User.update(req.params.id, { isSuspended: newStatus });
    res.json({ 
      message: newStatus ? 'User account suspended successfully' : 'User account unsuspended successfully', 
      user: updated 
    });
  } catch (err) {
    res.status(500).json({ message: 'Suspend toggle failed', error: err.message });
  }
});

// Retrieve all teachers (for Guest and Admin/Student view)
router.get('/teachers', async (req, res) => {
  try {
    let query = { role: 'teacher' };
    const authHeader = req.headers.authorization;
    let isAdmin = false;
    let userTenantId = null;

    if (authHeader) {
      try {
        const tok = authHeader.split(' ')[1];
        const dec = jwt.verify(tok, JWT_SECRET);
        isAdmin = dec.role === 'admin';
        userTenantId = dec.tenantId;
      } catch (_) {}
    }

    if (userTenantId) {
      query.tenantId = userTenantId;
    }

    const teachers = await User.findAll(query);
    
    if (isAdmin) {
      res.json(teachers);
    } else {
      const cleanTeachers = teachers.map(t => ({
        id: t.id,
        name: t.name,
        phone: t.phone,
        profile: t.profile,
        photoData: t.photoData
      }));
      res.json(cleanTeachers);
    }
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving teachers', error: err.message });
  }
});


// ==========================================
// 2. CURRICULUM, SUBJECTS & MATERIALS
// ==========================================

// Add Subject (Admin)
router.post('/subjects', requireRole(['admin']), async (req, res) => {
  try {
    const { name, level, className, description, category, code, classification } = req.body;
    if (!name || !level) {
      return res.status(400).json({ message: 'Subject name and level are required' });
    }

    const subject = await Subject.create({
      name,
      level,
      className: className || level,
      description,
      category: category || 'Both',
      code: code || null,
      classification: classification || null,
      tenantId: req.user.tenantId
    });
    res.status(201).json({ message: 'Subject created successfully', subject });
  } catch (err) {
    res.status(500).json({ message: 'Subject creation failed', error: err.message });
  }
});

// Edit Subject (Admin)
router.put('/subjects/:id', requireRole(['admin']), async (req, res) => {
  try {
    const { name, level, className, description, category, code, classification } = req.body;
    if (!name || !level) {
      return res.status(400).json({ message: 'Subject name and level are required' });
    }

    const updated = await Subject.update(req.params.id, {
      name,
      level,
      className: className || level,
      description,
      category: category || 'Both',
      code: code || null,
      classification: classification || null
    });
    res.json({ message: 'Subject updated successfully', subject: updated });
  } catch (err) {
    res.status(500).json({ message: 'Subject update failed', error: err.message });
  }
});

// List Subjects
router.get('/subjects', async (req, res) => {
  try {
    let query = {};
    const authHeader = req.headers.authorization;
    if (authHeader) {
      try {
        const tok = authHeader.split(' ')[1];
        const dec = jwt.verify(tok, JWT_SECRET);
        if (dec.role !== 'superadmin' && dec.tenantId) {
          query.tenantId = dec.tenantId;
        }
      } catch (_) {}
    }
    const subjects = await Subject.findAll(query);
    res.json(subjects);
  } catch (err) {
    res.status(500).json({ message: 'Error loading subjects', error: err.message });
  }
});

// Delete Subject (Admin)
router.delete('/subjects/:id', requireRole(['admin']), async (req, res) => {
  try {
    await Subject.delete(req.params.id);
    res.json({ message: 'Subject deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete subject', error: err.message });
  }
});

// Bulk Delete Subjects (Admin)
router.post('/subjects/bulk-delete', requireRole(['admin']), async (req, res) => {
  try {
    const { ids } = req.body; // Array of IDs to delete, or string 'all'
    if (!ids) {
      return res.status(400).json({ message: 'Subject IDs or action is required' });
    }

    if (ids === 'all') {
      const allSubjects = await Subject.findAll({});
      for (const s of allSubjects) {
        await Subject.delete(s.id);
      }
      return res.json({ message: 'All subjects deleted successfully' });
    }

    if (Array.isArray(ids)) {
      for (const id of ids) {
        await Subject.delete(id);
      }
      return res.json({ message: `${ids.length} subjects deleted successfully` });
    }

    res.status(400).json({ message: 'Invalid bulk delete payload' });
  } catch (err) {
    res.status(500).json({ message: 'Bulk deletion failed', error: err.message });
  }
});

// A' Level Combinations CRUD
// Add Combination (Admin)
router.post('/combinations', requireRole(['admin']), async (req, res) => {
  try {
    const { code, name, subjectIds } = req.body;
    if (!code || !name || !subjectIds) {
      return res.status(400).json({ message: 'Code, name, and subjectIds are required' });
    }

    const comb = await Combination.create({
      code,
      name,
      subjectIds: typeof subjectIds === 'string' ? subjectIds : JSON.stringify(subjectIds),
      tenantId: req.user.tenantId
    });
    res.status(201).json({ message: 'Combination created successfully', combination: comb });
  } catch (err) {
    res.status(500).json({ message: 'Combination creation failed', error: err.message });
  }
});

// Edit Combination (Admin)
router.put('/combinations/:id', requireRole(['admin']), async (req, res) => {
  try {
    const { code, name, subjectIds } = req.body;
    if (!code || !name || !subjectIds) {
      return res.status(400).json({ message: 'Code, name, and subjectIds are required' });
    }

    const updated = await Combination.update(req.params.id, {
      code,
      name,
      subjectIds: typeof subjectIds === 'string' ? subjectIds : JSON.stringify(subjectIds)
    });
    res.json({ message: 'Combination updated successfully', combination: updated });
  } catch (err) {
    res.status(500).json({ message: 'Combination update failed', error: err.message });
  }
});

// List Combinations (Public/Auth)
router.get('/combinations', async (req, res) => {
  try {
    let query = {};
    const authHeader = req.headers.authorization;
    if (authHeader) {
      try {
        const token = authHeader.split(' ')[1];
        const dec = jwt.verify(token, JWT_SECRET);
        if (dec.role !== 'superadmin') {
          query.tenantId = dec.tenantId;
        }
      } catch (_) {}
    }
    const combinations = await Combination.findAll(query);
    res.json(combinations);
  } catch (err) {
    res.status(500).json({ message: 'Error loading combinations', error: err.message });
  }
});

// Delete Combination (Admin)
router.delete('/combinations/:id', requireRole(['admin']), async (req, res) => {
  try {
    await Combination.delete(req.params.id);
    res.json({ message: 'Combination deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete combination', error: err.message });
  }
});

// Upload Notes & Materials (Admin and Teachers)
router.post('/materials', requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { title, type, contentUrl, subjectId, classLevel, combination, fileName, fileType, fileData } = req.body;
    if (!title || !type || !subjectId) {
      return res.status(400).json({ message: 'Title, type, and subject are required' });
    }

    const material = await Material.create({
      title,
      type,
      contentUrl, // Can be text content or link
      subjectId,
      teacherId: req.user.id,
      classLevel: classLevel || null,
      combination: combination || null,
      fileName: fileName || null,
      fileType: fileType || null,
      fileData: fileData || null, // Holds base64 encoded document content
      tenantId: req.user.tenantId
    });
    res.status(201).json({ message: 'Material uploaded successfully', material });
  } catch (err) {
    res.status(500).json({ message: 'Upload failed', error: err.message });
  }
});

// Get Materials (with Uganda Class/Level and A-Level Combination filtering)
router.get('/materials', async (req, res) => {
  try {
    let query = {};
    let usersQuery = {};
    const authHeader = req.headers.authorization;
    let decoded = null;
    
    if (authHeader) {
      try {
        const token = authHeader.split(' ')[1];
        decoded = jwt.verify(token, JWT_SECRET);
        if (decoded && decoded.role !== 'superadmin' && decoded.tenantId) {
          query.tenantId = decoded.tenantId;
          usersQuery.tenantId = decoded.tenantId;
        }
      } catch (err) {}
    }

    const materials = await Material.findAll(query);
    const users = await User.findAll(usersQuery);

    const materialsWithCreator = materials.map(m => {
      const creator = users.find(u => u.id == m.teacherId);
      return {
        ...m,
        creatorName: creator ? creator.name : 'System/Admin',
        creatorRole: creator ? creator.role : 'admin'
      };
    });
    
    // Check if token exists in header to filter for student roles
    if (decoded) {
      try {
        if (decoded.role === 'student') {
          // Always read level/combination from live DB (not JWT) so admin class-updates take effect immediately
          const liveStudent = users.find(u => u.id == decoded.id);
          const studentLevel = (liveStudent ? liveStudent.level : decoded.level) || '';
          const rawCombo = liveStudent ? liveStudent.combination : decoded.combination;
          const studentCombo = rawCombo ? rawCombo.toUpperCase().trim() : '';

          const filtered = materialsWithCreator.filter(m => {
            // 0. Block filter: hide blocked materials from students
            if (m.isBlocked) return false;

            // If no classLevel is set, it is public to all students.
            if (!m.classLevel) return true;

            const noteLevel = m.classLevel;

            // 1. P1-P3 students: view all notes uploaded at primary level for P1 to P3
            if (['P1', 'P2', 'P3'].includes(studentLevel)) {
              return ['P1', 'P2', 'P3'].includes(noteLevel);
            }

            // 2. P4-P7 students: view all notes uploaded at primary level for P1 to P7
            if (['P4', 'P5', 'P6', 'P7'].includes(studentLevel)) {
              return ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'].includes(noteLevel);
            }

            // 3. S1-S4 students: view all notes uploaded at O' level (S1-S4)
            if (['S1', 'S2', 'S3', 'S4'].includes(studentLevel)) {
              return ['S1', 'S2', 'S3', 'S4'].includes(noteLevel);
            }

            // 4. S5-S6 students: view all notes uploaded at A'level matching their combination
            if (['S5', 'S6'].includes(studentLevel)) {
              if (!['S5', 'S6'].includes(noteLevel)) return false;
              if (m.combination) {
                const noteCombo = m.combination.toUpperCase().trim();
                if (noteCombo && studentCombo !== noteCombo) {
                  return false;
                }
              }
              return true;
            }
            
            // Fallback for any other class level notes
            return noteLevel === studentLevel;
          });
          return res.json(filtered);
        }
      } catch (tokenErr) {
        // Fallback for expired token: only general resources (not blocked)
        const publicMaterials = materialsWithCreator.filter(m => !m.classLevel && !m.isBlocked);
        return res.json(publicMaterials);
      }
    }
    
    // Default (Admins, Teachers see all; Guests see general public materials where classLevel is not set)
    if (!authHeader) {
      const publicMaterials = materialsWithCreator.filter(m => !m.classLevel && !m.isBlocked);
      return res.json(publicMaterials);
    }
    
    res.json(materialsWithCreator);
  } catch (err) {
    res.status(500).json({ message: 'Error loading materials', error: err.message });
  }
});

// Edit Material (Admin)
router.put('/materials/:id', requireRole(['admin']), async (req, res) => {
  try {
    const { title, type, classLevel, combination, contentUrl } = req.body;
    const mat = await Material.findById(req.params.id);
    if (!mat) return res.status(404).json({ message: 'Material not found' });

    const updated = await Material.update(req.params.id, {
      title: title || mat.title,
      type: type || mat.type,
      classLevel: classLevel !== undefined ? classLevel : mat.classLevel,
      combination: combination !== undefined ? combination : mat.combination,
      contentUrl: contentUrl !== undefined ? contentUrl : mat.contentUrl,
    });
    res.json({ message: 'Material updated successfully', material: updated });
  } catch (err) {
    res.status(500).json({ message: 'Material update failed', error: err.message });
  }
});

// Block / Unblock Material (Admin)
router.put('/materials/:id/block', requireRole(['admin']), async (req, res) => {
  try {
    const mat = await Material.findById(req.params.id);
    if (!mat) return res.status(404).json({ message: 'Material not found' });

    const newBlocked = !mat.isBlocked;
    const updated = await Material.update(req.params.id, { isBlocked: newBlocked });
    res.json({ 
      message: newBlocked ? 'Material blocked — students cannot see it' : 'Material unblocked — students can see it', 
      material: updated 
    });
  } catch (err) {
    res.status(500).json({ message: 'Block toggle failed', error: err.message });
  }
});

// Delete Material (Admin & Teacher who created it)
router.delete('/materials/:id', requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const mat = await Material.findOne({ id: req.params.id });
    if (!mat) {
      return res.status(404).json({ message: 'Material not found' });
    }
    
    // Teachers can only delete their own materials
    if (req.user.role === 'teacher' && mat.teacherId != req.user.id) {
      return res.status(403).json({ message: 'You are not authorized to modify this material.' });
    }

    await Material.delete(req.params.id);
    res.json({ message: 'Material deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete material', error: err.message });
  }
});


// ==========================================
// 3. ACTIVITIES & ASSESSMENTS
// ==========================================

// Create Activity (Admin & Teachers)
router.post('/activities', requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { title, instructions, levelType, maxScore, subjectId, classLevel, combination, fileName, fileType, fileData } = req.body;
    if (!title || !instructions || !levelType || !subjectId) {
      return res.status(400).json({ message: 'Title, instructions, level type, and subject are required' });
    }

    const activity = await Activity.create({
      title,
      instructions,
      levelType, // Primary, O-Level, A-Level
      maxScore: Number(maxScore) || (levelType === 'O-Level' ? 3 : 100),
      subjectId,
      teacherId: req.user.id,
      classLevel: classLevel || null,
      combination: combination || null,
      fileName: fileName || null,
      fileType: fileType || null,
      fileData: fileData || null,
    });
    res.status(201).json({ message: 'Activity created successfully', activity });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create activity', error: err.message });
  }
});

// List activities (with level & combination filtering for students)
router.get('/activities', async (req, res) => {
  try {
    const activities = await Activity.findAll({});
    const users = await User.findAll({});

    const authHeader = req.headers.authorization;
    if (authHeader) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        if (decoded.role === 'student') {
          // Always read level/combination from live DB so admin class-updates take effect immediately
          const liveStudent = users.find(u => u.id == decoded.id);
          const studentLevel = (liveStudent ? liveStudent.level : decoded.level) || '';
          const rawCombo = liveStudent ? liveStudent.combination : decoded.combination;
          const studentCombo = rawCombo ? rawCombo.toUpperCase().trim() : '';

          const filtered = activities.filter(a => {
            // 0. Block filter
            if (a.isBlocked) return false;

            // If no classLevel set, public to all students
            if (!a.classLevel) return true;

            // Exact class match — activities are class-specific
            if (a.classLevel !== studentLevel) return false;

            // A-Level combination filter for S5/S6
            if (['S5', 'S6'].includes(studentLevel) && a.combination) {
              const actCombo = a.combination.toUpperCase().trim();
              if (actCombo && studentCombo !== actCombo) return false;
            }

            return true;
          });
          return res.json(filtered);
        }
      } catch (tokenErr) {
        // Expired/invalid token — return only unfiltered public activities (not blocked)
        return res.json(activities.filter(a => !a.classLevel && !a.isBlocked));
      }
    }

    res.json(activities);
  } catch (err) {
    res.status(500).json({ message: 'Failed to retrieve activities' });
  }
});

// Edit Activity (Admin)
router.put('/activities/:id', requireRole(['admin']), async (req, res) => {
  try {
    const { title, instructions, levelType, classLevel, combination, maxScore } = req.body;
    const act = await Activity.findById(req.params.id);
    if (!act) return res.status(404).json({ message: 'Activity not found' });

    const updated = await Activity.update(req.params.id, {
      title: title || act.title,
      instructions: instructions || act.instructions,
      levelType: levelType || act.levelType,
      classLevel: classLevel !== undefined ? classLevel : act.classLevel,
      combination: combination !== undefined ? combination : act.combination,
      maxScore: maxScore !== undefined ? Number(maxScore) : act.maxScore,
    });
    res.json({ message: 'Activity updated successfully', activity: updated });
  } catch (err) {
    res.status(500).json({ message: 'Activity update failed', error: err.message });
  }
});

// Block / Unblock Activity (Admin)
router.put('/activities/:id/block', requireRole(['admin']), async (req, res) => {
  try {
    const act = await Activity.findById(req.params.id);
    if (!act) return res.status(404).json({ message: 'Activity not found' });

    const newBlocked = !act.isBlocked;
    const updated = await Activity.update(req.params.id, { isBlocked: newBlocked });
    res.json({ 
      message: newBlocked ? 'Activity blocked — students cannot see it' : 'Activity unblocked — students can see it', 
      activity: updated 
    });
  } catch (err) {
    res.status(500).json({ message: 'Block toggle failed', error: err.message });
  }
});

// Delete Activity
router.delete('/activities/:id', requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    await Activity.delete(req.params.id);
    res.json({ message: 'Activity deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete activity' });
  }
});

// Submit Activity Attempt (Students)
router.post('/submissions', requireRole(['student']), async (req, res) => {
  try {
    const { activityId, studentAnswer, fileName, fileType, fileData } = req.body;
    if (!activityId) {
      return res.status(400).json({ message: 'Activity ID is required' });
    }
    if (!studentAnswer && !fileData) {
      return res.status(400).json({ message: 'Please write an answer or upload a PDF document.' });
    }

    // Check if student already submitted this
    const submissions = await Submission.findAll({ activityId, studentId: req.user.id });
    if (submissions.length > 0) {
      return res.status(400).json({ message: 'You have already submitted an attempt for this activity.' });
    }

    const sub = await Submission.create({
      activityId,
      studentId: req.user.id,
      studentAnswer: studentAnswer || '',
      fileName: fileName || null,
      fileType: fileType || null,
      fileData: fileData || null,
      isMarked: false
    });
    res.status(201).json({ message: 'Activity submitted successfully to your teacher for marking.', submission: sub });
  } catch (err) {
    res.status(500).json({ message: 'Submission failed', error: err.message });
  }
});

// Get Submissions (Teachers & Students)
router.get('/submissions', verifyToken, async (req, res) => {
  try {
    let subs = [];
    if (req.user.role === 'student') {
      subs = await Submission.findAll({ studentId: req.user.id });
    } else {
      // Teachers & Admin can see all
      subs = await Submission.findAll({});
    }
    res.json(subs);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load submissions', error: err.message });
  }
});

// Mark Submission (Teachers)
router.put('/submissions/:id/mark', requireRole(['teacher']), async (req, res) => {
  try {
    const { score, feedback } = req.body;
    if (score === undefined || score === null) {
      return res.status(400).json({ message: 'Please enter a mark' });
    }

    const sub = await Submission.findById(req.params.id);
    if (!sub) return res.status(404).json({ message: 'Submission not found' });

    // Validate score ranges
    const act = await Activity.findById(sub.activityId);
    if (act && act.levelType === 'O-Level') {
      const s = Number(score);
      if (![1, 2, 3].includes(s)) {
        return res.status(400).json({ message: 'O-Level NLSC assessment score must be 1 (Basic), 2 (Achieving), or 3 (Advanced).' });
      }
    }

    const updated = await Submission.update(req.params.id, {
      score: Number(score),
      feedback,
      isMarked: true,
      markedAt: new Date()
    });

    res.json({ message: 'Submission marked and score submitted successfully', submission: updated });
  } catch (err) {
    res.status(500).json({ message: 'Failed to mark submission', error: err.message });
  }
});


// ==========================================
// 4. SCHEDULES & LIVE LESSONS
// ==========================================

// Create Live Lesson Link (Admin & Teachers)
router.post('/lessons', requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { title, scheduleTime, meetUrl, subjectId, level } = req.body;
    if (!title || !scheduleTime || !meetUrl || !subjectId || !level) {
      return res.status(400).json({ message: 'All live lesson scheduling fields are required' });
    }

    const lesson = await Lesson.create({
      title,
      scheduleTime,
      meetUrl,
      subjectId,
      level,
      teacherId: req.user.id
    });
    res.status(201).json({ message: 'Live lesson scheduled successfully', lesson });
  } catch (err) {
    res.status(500).json({ message: 'Scheduling failed', error: err.message });
  }
});

// View upcoming lessons
router.get('/lessons', async (req, res) => {
  try {
    const lessons = await Lesson.findAll({});
    const users = await User.findAll({});
    const lessonsWithTeacher = lessons.map(l => {
      const creator = users.find(u => u.id == l.teacherId);
      return {
        ...l,
        creatorName: creator ? creator.name : 'Unknown',
        creatorRole: creator ? creator.role : ''
      };
    });
    res.json(lessonsWithTeacher);
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving lessons' });
  }
});

// Delete scheduled lesson
router.delete('/lessons/:id', requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    await Lesson.delete(req.params.id);
    res.json({ message: 'Lesson schedule deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting lesson' });
  }
});


// ==========================================
// 5. GUEST FEEDBACKS & WHATSAPP CHATBOT
// ==========================================

// Post Guest Feedback
router.post('/guest/feedback', async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ message: 'Please enter all feedback fields' });
    }

    const feed = await Feedback.create({ name, email, message });
    res.status(201).json({ message: 'Thank you for your feedback! The Administrator has been notified.', feedback: feed });
  } catch (err) {
    res.status(500).json({ message: 'Failed to record feedback' });
  }
});

// View Guest Feedbacks (SuperAdmin)
router.get('/superadmin/feedbacks', requireRole(['superadmin']), async (req, res) => {
  try {
    const list = await Feedback.findAll({});
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load feedbacks' });
  }
});

// Create/Update Chatbot Responses (SuperAdmin)
router.post('/superadmin/chatbot', requireRole(['superadmin']), async (req, res) => {
  try {
    const { keyword, response } = req.body;
    if (!keyword || !response) return res.status(400).json({ message: 'Keyword and Response are required' });

    const existing = await ChatbotResponse.findOne({ keyword: keyword.toLowerCase() });
    let record;
    if (existing) {
      record = await ChatbotResponse.update(existing.id, { response });
    } else {
      record = await ChatbotResponse.create({ keyword: keyword.toLowerCase(), response });
    }
    res.json({ message: 'Chatbot rule saved successfully', chatbot: record });
  } catch (err) {
    res.status(500).json({ message: 'Failed to save chatbot rule' });
  }
});

// Get Chatbot Response (Guests & Widgets)
router.get('/chatbot', async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.status(400).json({ message: 'Query is empty' });

    const normalized = query.toLowerCase().trim();
    const rules = await ChatbotResponse.findAll({});
    
    // Look for matching keyword
    const match = rules.find(rule => normalized.includes(rule.keyword));

    if (match) {
      return res.json({ reply: match.response });
    }

    // Default Ugandan chatbot replies
    if (normalized.includes('hello') || normalized.includes('hi')) {
      return res.json({ reply: "Gyebaleko! (Hello!) Welcome to Alinda Digital Learners Chatbot. How can I help you today? You can ask about 'fees', 'admission', 'contacts', or 'subjects'." });
    } else if (normalized.includes('fee')) {
      return res.json({ reply: "Our digital learning terms are:\nPrimary (P1-P7): UGX 150,000\nO-Level (S1-S4): UGX 200,000\nA-Level (S5-S6): UGX 250,000.\nThis covers interactive notes, AutoAssistant AI research, and live lesson conferencing." });
    } else if (normalized.includes('admission') || normalized.includes('register') || normalized.includes('join')) {
      return res.json({ reply: "Register on our Auth portal. Once registered, the Admin approves your account, and you will select your class (Primary, O-Level, or A-Level) to begin attending live lessons." });
    } else if (normalized.includes('contact') || normalized.includes('phone') || normalized.includes('call')) {
      return res.json({ reply: "You can contact our main registrar at +256 700 000 000 or email info@alindadigital.ug." });
    } else if (normalized.includes('subject') || normalized.includes('class')) {
      return res.json({ reply: "We support P1-P7 Primary curriculum, S1-S4 O-Level (following the new Ugandan Competency-Based NLSC), and S5-S6 A-Level principal/subsidiary combinations." });
    }

    res.json({ reply: "Webale! Thank you for your question. I couldn't match a quick answer for that. You can type 'contacts' to reach a real representative, or register and login to ask our AutoAssistant AI." });
  } catch (err) {
    res.status(500).json({ message: 'Chatbot match error' });
  }
});


// Helper to perform web searches using DuckDuckGo HTML interface
async function searchWeb(query) {
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const { data: html } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      },
      timeout: 8000
    });

    const results = [];

    // Extract snippet text blocks
    const snippetMatches = [...html.matchAll(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g)];
    // Extract title text blocks
    const titleMatches = [...html.matchAll(/class="result__a"[^>]*>([\s\S]*?)<\/a>/g)];
    // Extract URLs from DuckDuckGo redirect params
    const urlMatches = [...html.matchAll(/uddg=([^&"]+)/g)];

    const maxResults = Math.min(5, snippetMatches.length, titleMatches.length);
    for (let i = 0; i < maxResults; i++) {
      const title = titleMatches[i][1].replace(/<[^>]+>/g, '').trim();
      const snippet = snippetMatches[i][1].replace(/<[^>]+>/g, '').trim();
      let url = '';
      if (urlMatches[i]) {
        try { url = decodeURIComponent(urlMatches[i][1]); } catch { url = ''; }
      }
      if (title && snippet) {
        results.push({ title, url, snippet });
      }
    }

    console.log(`[searchWeb] Extracted ${results.length} results for: "${query}"`);
    return results;
  } catch (error) {
    console.error('[searchWeb] Error:', error.message);
    return [];
  }
}



// Optional / Flexible Auth middleware for AI assistant (allows both authenticated users and guests)
function optionalAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (token && token !== 'null' && token !== 'undefined') {
    try {
      const verified = jwt.verify(token, JWT_SECRET);
      req.user = verified;
    } catch (err) {
      req.user = { username: 'guest', role: 'guest', level: 'General Study' };
    }
  } else {
    req.user = { username: 'guest', role: 'guest', level: 'General Study' };
  }
  next();
}

// Helper: Solve Math & Geometry expressions
function solveMathQuery(query) {
  const q = query.trim().toLowerCase();
  
  // 1. Linear Equation: ax + b = c or ax - b = c
  const linMatch = q.match(/(?:solve\s+)?([+-]?\s*\d*)\s*x\s*([+-]\s*\d+)?\s*=\s*([+-]?\s*\d+)/i);
  if (linMatch) {
    let aStr = (linMatch[1] || '1').replace(/\s+/g, '');
    if (aStr === '' || aStr === '+') aStr = '1';
    if (aStr === '-') aStr = '-1';
    const a = parseFloat(aStr);
    const b = parseFloat((linMatch[2] || '0').replace(/\s+/g, ''));
    const c = parseFloat((linMatch[3] || '0').replace(/\s+/g, ''));
    
    if (!isNaN(a) && !isNaN(b) && !isNaN(c) && a !== 0) {
      const rhs = c - b;
      const xVal = Math.round((rhs / a) * 1000) / 1000;
      const eqDisplay = `${a !== 1 ? (a === -1 ? '-' : a) : ''}x ${b >= 0 ? '+ ' + b : '- ' + Math.abs(b)} = ${c}`;
      
      const answer = `### 📐 Mathematics Step-by-Step Solution\n\n` +
        `**Linear Equation:** $${eqDisplay}$\n\n` +
        `**Step 1:** Subtract ${b} from both sides:\n` +
        `$$${a !== 1 ? a : ''}x = ${c} ${b >= 0 ? '- ' + b : '+ ' + Math.abs(b)} \\implies ${a !== 1 ? a : ''}x = ${rhs}$$\n\n` +
        `**Step 2:** Divide both sides by ${a}:\n` +
        `$$x = \\frac{${rhs}}{${a}} \\implies x = ${xVal}$$\n\n` +
        `---\n\n` +
        `**Final Solution:** **\`x = ${xVal}\`**`;
      return { equation: eqDisplay, answer };
    }
  }

  // 2. Percentage calculation: X% of Y
  const pctMatch = q.match(/(\d+(?:\.\d+)?)\s*%\s*(?:of)?\s*(\d+(?:\.\d+)?)/i);
  if (pctMatch) {
    const pct = parseFloat(pctMatch[1]);
    const num = parseFloat(pctMatch[2]);
    const result = Math.round(((pct / 100) * num) * 1000) / 1000;
    const answer = `### 📐 Percentage Calculation\n\n` +
      `**Problem:** Calculate **${pct}% of ${num}**\n\n` +
      `**Formula:** $$\\text{Value} = \\frac{\\text{Percentage}}{100} \\times \\text{Total}$$\n\n` +
      `**Calculation:** $$\\frac{${pct}}{100} \\times ${num} = ${result}$$\n\n` +
      `---\n\n` +
      `**Final Result:** **\`${result}\`**`;
    return { equation: `${pct}% of ${num}`, answer };
  }

  // 3. Circle Geometry: Area or Circumference with radius / diameter
  const circleMatch = q.match(/(?:area|circumference|perimeter)\s+(?:of\s+)?(?:a\s+)?circle.*?(?:radius|r|diameter|d)\s*(?:=|\s)?\s*(\d+(?:\.\d+)?)/i);
  if (circleMatch) {
    let val = parseFloat(circleMatch[1]);
    let r = val;
    let isDiameter = q.includes('diameter') || q.includes('d =');
    if (isDiameter) r = val / 2;

    const area = Math.round((Math.PI * r * r) * 100) / 100;
    const circ = Math.round((2 * Math.PI * r) * 100) / 100;

    const answer = `### ⭕ Circle Geometry Solution\n\n` +
      `**Given:** Radius $r = ${r}$ units ${isDiameter ? `(from diameter $d = ${val}$)` : ''}\n\n` +
      `**1. Area Formula:** $$A = \\pi r^2 = 3.14159 \\times ${r}^2 = ${area}\\text{ sq units}$$\n\n` +
      `**2. Circumference Formula:** $$C = 2\\pi r = 2 \\times 3.14159 \\times ${r} = ${circ}\\text{ units}$$\n\n` +
      `---\n\n` +
      `**Final Answers:**\n` +
      `* **Area:** **\`${area}\`** sq units\n` +
      `* **Circumference:** **\`${circ}\`** units`;
    return { equation: `Circle radius ${r}`, answer };
  }

  return null;
}

// Helper: Fetch Wikipedia summary
async function fetchWikipediaKnowledge(query) {
  try {
    const headers = { 'User-Agent': 'AlindaDigitalLearners/1.0 (contact@alindaschool.ug)' };
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json`;
    const res = await axios.get(searchUrl, { headers, timeout: 6000 });
    const hits = res.data?.query?.search || [];
    if (hits.length === 0) return null;

    const topHit = hits[0];
    const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topHit.title)}`;
    const sumRes = await axios.get(summaryUrl, { headers, timeout: 6000 });

    return {
      title: sumRes.data?.title || topHit.title,
      extract: sumRes.data?.extract || topHit.snippet.replace(/<[^>]+>/g, ''),
      url: sumRes.data?.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(topHit.title)}`
    };
  } catch (err) {
    return null;
  }
}

// Helper: Synthesize Wikipedia + Web results into a curriculum-aligned academic response
function formatSynthesizedAnswer(query, wikiData, webData, userLevel) {
  // First check if the built-in engine has a detailed answer for this topic
  const builtIn = builtInAcademicEngine(query, userLevel);
  const isGenericBuiltIn = builtIn.includes('How to Study This Topic'); // default response
  
  let output = '';

  // If the built-in engine has a subject-specific answer, lead with it
  if (!isGenericBuiltIn) {
    output += builtIn + '\n\n---\n\n';
  }

  if (wikiData) {
    output += `### 📖 Additional Reference: ${wikiData.title}\n\n`;
    output += `${wikiData.extract}\n\n`;
  }

  output += `---\n\n### 🎓 Uganda Curriculum Alignment (${userLevel || 'Primary / Secondary'})\n`;
  output += `* **NCDC Learning Objectives**: This topic corresponds to study modules under the **National Curriculum Development Centre (NCDC)** guidelines.\n`;
  output += `* **Revision Tips**: When answering continuous assessments or UNEB national examinations (PLE / UCE / UACE), present clear definitions, key characteristics, and structured bullet points.\n`;

  if (webData && webData.length > 0) {
    output += `\n---\n\n### 🌐 Web & Academic References\n`;
    webData.slice(0, 3).forEach(r => {
      if (r.title && r.snippet) {
        output += `* **[${r.title}](${r.url || '#'})**\n  _${r.snippet}_\n\n`;
      }
    });
  } else if (wikiData && wikiData.url) {
    output += `\n---\n\n### 🌐 Reference Link\n* **[Read full article on ${wikiData.title}](${wikiData.url})**\n`;
  }

  // If we only had the generic response and nothing from Wikipedia, use built-in engine as-is
  if (isGenericBuiltIn && !wikiData) {
    return builtIn;
  }

  return output;
}


// ══════════════════════════════════════════════════════════════════════════════
// COMPREHENSIVE BUILT-IN ACADEMIC KNOWLEDGE ENGINE
// Covers Biology, Chemistry, Physics, Math, History, Geography, ICT, English,
// Economics, Entrepreneurship — aligned to Uganda NCDC/UNEB curriculum
// ══════════════════════════════════════════════════════════════════════════════
function builtInAcademicEngine(query, userLevel) {
  const q = query.toLowerCase().trim();

  // Determine exam level label
  const lvl = (userLevel || '').toUpperCase();
  const isALevel = ['S5','S6','A-LEVEL'].some(k => lvl.includes(k));
  const isPrimary = lvl.startsWith('P') || lvl === 'PRIMARY';
  const levelNote = isPrimary ? '*(Primary Curriculum — PLE)*'
    : isALevel ? '*(A-Level — UACE)*'
    : '*(O-Level — UCE / NLSC)*';

  // ── BIOLOGY ────────────────────────────────────────────────────────────────
  if (q.match(/photosynthes|chlorophyll|light reaction|calvin cycle|dark reaction/)) {
    return `## 🌿 Photosynthesis ${levelNote}

**Definition:** Photosynthesis is the process by which green plants use sunlight energy, water, and carbon dioxide to manufacture glucose and release oxygen.

**Overall Equation:**
$$6CO_2 + 6H_2O \\xrightarrow{\\text{Sunlight + Chlorophyll}} C_6H_{12}O_6 + 6O_2$$

### Stage 1 — Light-Dependent Reactions (Grana of Chloroplast)
- Light energy splits water molecules (**Photolysis**): $2H_2O \\rightarrow 4H^+ + 4e^- + O_2$
- ATP and NADPH are produced
- Oxygen is released as a by-product

### Stage 2 — Light-Independent Reactions / Calvin Cycle (Stroma)
- CO₂ is fixed using ATP and NADPH
- Glucose ($C_6H_{12}O_6$) is synthesised
- RuBP (5C) is regenerated

### Factors Affecting Photosynthesis
| Factor | Effect |
|--------|--------|
| Light intensity | Increases rate (up to a limit) |
| CO₂ concentration | Increases rate (up to a limit) |
| Temperature | Optimum ~25–35°C; enzyme denaturation above 40°C |
| Water availability | Stomata close in drought, reducing CO₂ uptake |

> 💡 **Exam Tip (${userLevel}):** In UNEB exams, always give the word equation AND the chemical equation. Label your chloroplast diagram clearly.`;
  }

  if (q.match(/cell divis|mitosis|meiosis|chromosome|dna|genetics|heredit|mendel/)) {
    return `## 🔬 Cell Division & Genetics ${levelNote}

### Mitosis (For Growth & Repair)
Produces **2 identical diploid daughter cells** (same chromosome number as parent).

**Stages:** Prophase → Metaphase → Anaphase → Telophase → Cytokinesis

### Meiosis (For Sexual Reproduction)
Produces **4 genetically different haploid daughter cells** (half the chromosome number).

**Key Events:**
- Crossing over (prophase I) — genetic variation
- Independent assortment — random chromosome alignment
- Two divisions: Meiosis I (separation of homologous pairs) & Meiosis II (separation of chromatids)

### Mendelian Genetics
- **Dominant allele**: expressed even if only one copy present (e.g. T)
- **Recessive allele**: expressed only if two copies present (e.g. t)
- **Genotype**: genetic makeup (e.g. Tt, TT, tt)
- **Phenotype**: observed characteristic (e.g. Tall, Short)

**Monohybrid Cross Example:** Tt × Tt
$$\\text{Offspring: } \\frac{1}{4}TT : \\frac{2}{4}Tt : \\frac{1}{4}tt \\quad \\Rightarrow 3 \\text{ Tall} : 1 \\text{ Short}$$

> 💡 **Exam Tip:** Draw a Punnett square for every genetics question. Show parental gametes clearly.`;
  }

  if (q.match(/circulat|heart|blood vessel|artery|vein|capillary|cardiac|pulse|hemoglobin/)) {
    return `## ❤️ The Human Circulatory System ${levelNote}

**Function:** Transports oxygen, nutrients, hormones, and antibodies; removes CO₂ and metabolic wastes.

### Components
1. **The Heart** — 4-chambered muscular pump
   - Right Atrium → Right Ventricle → Lungs (Pulmonary circuit)
   - Left Atrium → Left Ventricle → Body (Systemic circuit)

2. **Blood Vessels**
| Vessel | Wall | Pressure | Direction | Valves |
|--------|------|----------|-----------|--------|
| Artery | Thick, elastic | High | Away from heart | No |
| Vein | Thin | Low | To heart | Yes (semi-lunar) |
| Capillary | 1 cell thick | Very low | Exchange | No |

3. **Blood Composition**
   - 🔴 **Red Blood Cells (Erythrocytes):** Carry O₂ via haemoglobin
   - ⚪ **White Blood Cells (Leukocytes):** Immune defence
   - 🟡 **Platelets (Thrombocytes):** Blood clotting
   - 💛 **Plasma:** Liquid medium transporting nutrients, CO₂, hormones

> 💡 **Exam Tip:** Remember — Pulmonary Artery carries deoxygenated blood (to lungs) and Pulmonary Vein carries oxygenated blood (from lungs) — opposite to the usual rule!`;
  }

  if (q.match(/respir|aerobic|anaerobic|atp|glucose oxidat|krebs|glycolysis/)) {
    return `## 💨 Respiration ${levelNote}

**Definition:** The biochemical process of breaking down glucose to release energy (ATP) in living cells.

### Aerobic Respiration (With Oxygen)
$$C_6H_{12}O_6 + 6O_2 \\rightarrow 6CO_2 + 6H_2O + \\text{38 ATP}$$

**Stages:**
1. **Glycolysis** (Cytoplasm) — Glucose → 2 Pyruvate + 2 ATP
2. **Link Reaction** (Mitochondrial matrix) — Pyruvate → Acetyl CoA + CO₂
3. **Krebs Cycle** (Mitochondrial matrix) — Generates CO₂ + reduced coenzymes
4. **Oxidative Phosphorylation** (Inner mitochondrial membrane) — Produces ~34 ATP

### Anaerobic Respiration (Without Oxygen)
- In **animals/humans:** Glucose → Lactic Acid + 2 ATP *(causes muscle fatigue)*
- In **yeast/plants:** Glucose → Ethanol + CO₂ + 2 ATP *(fermentation)*

> 💡 **Exam Tip:** Aerobic respiration releases **much more ATP (38)** than anaerobic (2). Always state the location of each stage.`;
  }

  // ── CHEMISTRY ─────────────────────────────────────────────────────────────
  if (q.match(/periodic table|element|atomic number|atomic mass|valency|electron configur/)) {
    return `## ⚗️ The Periodic Table & Atomic Structure ${levelNote}

**Atomic Structure:**
- **Protons** (positive, in nucleus) = Atomic number (Z)
- **Neutrons** (neutral, in nucleus) = Mass number − Atomic number
- **Electrons** (negative, in shells/orbitals)

**Electron Configuration Examples:**
| Element | Z | Configuration |
|---------|---|---------------|
| Hydrogen | 1 | 1 |
| Carbon | 6 | 2, 4 |
| Nitrogen | 7 | 2, 5 |
| Oxygen | 8 | 2, 6 |
| Sodium | 11 | 2, 8, 1 |
| Chlorine | 17 | 2, 8, 7 |

### Periodic Table Trends (Across a Period, Left → Right)
- Atomic radius **decreases** (more protons pull electrons closer)
- Ionisation energy **increases**
- Electronegativity **increases**

### Groups
- **Group I (Alkali Metals):** Na, K, Li — react with water producing H₂
- **Group VII (Halogens):** F, Cl, Br, I — non-metals, form salts
- **Group 0/VIII (Noble Gases):** He, Ne, Ar — inert (full outer shell)

> 💡 **Exam Tip:** Valency = number of electrons in the outer shell (or 8 minus that for non-metals).`;
  }

  if (q.match(/acid|base|alkali|ph|neutralis|salt|indicator|titrat/)) {
    return `## 🧪 Acids, Bases & Neutralisation ${levelNote}

### Definitions
- **Acid:** Substance that donates H⁺ ions in solution. pH < 7.
- **Base:** Substance that accepts H⁺ ions. Soluble bases are called **alkalis**. pH > 7.
- **Neutral:** pH = 7 (e.g. pure water)

### pH Scale
$$1 \\leftarrow \\underbrace{\\quad \\text{Acids} \\quad}_{1-6} \\underbrace{\\quad 7 \\quad}_{\\text{Neutral}} \\underbrace{\\quad \\text{Alkalis} \\quad}_{8-14} \\rightarrow 14$$

### Common Acids & Bases
| Acid | Formula | Base | Formula |
|------|---------|------|---------|
| Hydrochloric acid | HCl | Sodium hydroxide | NaOH |
| Sulphuric acid | H₂SO₄ | Calcium hydroxide | Ca(OH)₂ |
| Nitric acid | HNO₃ | Ammonia | NH₃ |

### Neutralisation Equation
$$\\text{Acid} + \\text{Base} \\rightarrow \\text{Salt} + \\text{Water}$$
$$HCl + NaOH \\rightarrow NaCl + H_2O$$

### Indicators
| Indicator | Acid Colour | Base Colour |
|-----------|-------------|-------------|
| Litmus | Red | Blue |
| Phenolphthalein | Colourless | Pink |
| Universal | Red/Orange | Blue/Violet |

> 💡 **Exam Tip:** In titration, record burette readings to 2 decimal places. Calculate the average of concordant results.`;
  }

  // ── PHYSICS ───────────────────────────────────────────────────────────────
  if (q.match(/newton|force|motion|velocity|acceleration|momentum|newton.s law/)) {
    return `## ⚡ Newton's Laws of Motion & Forces ${levelNote}

### Newton's Three Laws
1. **First Law (Inertia):** An object remains at rest or in uniform motion unless acted upon by an external unbalanced force.

2. **Second Law (F = ma):** The net force on an object equals its mass times acceleration.
$$F = ma$$
Where F = Force (Newtons, N), m = mass (kg), a = acceleration (m/s²)

3. **Third Law (Action-Reaction):** For every action, there is an equal and opposite reaction.

### Key Formulae
| Quantity | Formula | Units |
|----------|---------|-------|
| Velocity | $v = u + at$ | m/s |
| Distance | $s = ut + \\frac{1}{2}at^2$ | m |
| Momentum | $p = mv$ | kg·m/s |
| Weight | $W = mg$ | N |
| Kinetic Energy | $KE = \\frac{1}{2}mv^2$ | J |

**g = 10 m/s² (or 9.8 m/s² in Uganda UNEB exams)**

### Momentum & Impulse
$$\\text{Impulse} = F \\times t = \\Delta p = m(v - u)$$

**Conservation of Momentum:** In a closed system, total momentum before collision = total momentum after collision.

> 💡 **Exam Tip:** Always draw a free-body diagram showing all forces. State units in every answer.`;
  }

  if (q.match(/electric|current|voltage|resistance|ohm|circuit|power|watt|ampere|conductor/)) {
    return `## ⚡ Electricity & Circuits ${levelNote}

### Key Quantities
| Quantity | Symbol | Unit | Definition |
|----------|--------|------|------------|
| Current | I | Ampere (A) | Rate of flow of charge |
| Voltage (p.d.) | V | Volt (V) | Energy per unit charge |
| Resistance | R | Ohm (Ω) | Opposition to current flow |
| Power | P | Watt (W) | Rate of energy transfer |
| Charge | Q | Coulomb (C) | Q = It |

### Ohm's Law
$$V = IR$$

### Power Formulae
$$P = IV = I^2R = \\frac{V^2}{R}$$

### Series & Parallel Circuits
| Property | Series | Parallel |
|----------|--------|----------|
| Current | Same throughout | Splits at junction |
| Voltage | Splits across components | Same across each branch |
| Resistance | $R_T = R_1 + R_2 + ...$ | $\\frac{1}{R_T} = \\frac{1}{R_1} + \\frac{1}{R_2} + ...$ |

**Worked Example:** If V = 12V, R = 4Ω, find I:
$$I = \\frac{V}{R} = \\frac{12}{4} = 3 \\text{ A}$$

> 💡 **Exam Tip:** In UNEB, always show the formula, substitution, and final answer with units.`;
  }

  if (q.match(/wave|frequency|wavelength|amplitude|sound|light|refract|reflect|diffract|electromagnetic/)) {
    return `## 🌊 Waves, Light & Sound ${levelNote}

### Wave Properties
$$v = f\\lambda$$
Where v = wave speed (m/s), f = frequency (Hz), λ = wavelength (m)

| Property | Definition |
|----------|------------|
| Amplitude | Maximum displacement from equilibrium |
| Frequency | Number of complete waves per second (Hz) |
| Wavelength | Distance between two successive crests/troughs |
| Period | Time for one complete wave: $T = 1/f$ |

### Types of Waves
- **Transverse:** Displacement ⊥ to direction of travel (e.g. light, water waves)
- **Longitudinal:** Displacement ∥ to direction of travel (e.g. sound)

### Light: Reflection & Refraction
**Reflection:** Angle of incidence = Angle of reflection

**Snell's Law (Refraction):**
$$n_1 \\sin\\theta_1 = n_2 \\sin\\theta_2$$

**Refractive index:** $n = \\frac{c}{v} = \\frac{\\sin i}{\\sin r}$

### Electromagnetic Spectrum (low→high frequency)
Radio → Microwave → Infrared → **Visible Light** → Ultraviolet → X-rays → Gamma rays

> 💡 **Exam Tip:** Sound cannot travel through a vacuum. Light can. Remember this distinction for exam MCQs.`;
  }

  // ── MATHEMATICS ───────────────────────────────────────────────────────────
  if (q.match(/quadratic|factori|completing the square|discriminant|formula.*root/)) {
    return `## 📐 Quadratic Equations ${levelNote}

**Standard Form:** $ax^2 + bx + c = 0$

### Method 1: Factorisation
Find two numbers that multiply to $ac$ and add to $b$.

**Example:** Solve $x^2 + 5x + 6 = 0$
- Numbers: 2 × 3 = 6, 2 + 3 = 5
- $(x + 2)(x + 3) = 0$
- $x = -2$ or $x = -3$ ✓

### Method 2: Quadratic Formula
$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$

**Discriminant:** $\\Delta = b^2 - 4ac$
- $\\Delta > 0$: Two distinct real roots
- $\\Delta = 0$: One repeated root
- $\\Delta < 0$: No real roots (complex)

### Method 3: Completing the Square
$(x + \\frac{b}{2a})^2 = \\frac{b^2 - 4ac}{4a^2}$

**Example:** $x^2 + 6x + 5 = 0$
→ $(x+3)^2 - 9 + 5 = 0$
→ $(x+3)^2 = 4$
→ $x = -3 \\pm 2$ → $x = -1$ or $x = -5$

> 💡 **Exam Tip:** Always check your answers by substituting back into the original equation.`;
  }

  if (q.match(/trigonometry|sine|cosine|tangent|pythagoras|hypotenuse|sin|cos|tan|angle/)) {
    return `## 📐 Trigonometry & Pythagoras ${levelNote}

### Pythagoras Theorem (Right-angled triangles)
$$a^2 + b^2 = c^2$$
Where $c$ is the hypotenuse (longest side).

### Trigonometric Ratios (SOH-CAH-TOA)
$$\\sin\\theta = \\frac{\\text{Opposite}}{\\text{Hypotenuse}} \\quad \\cos\\theta = \\frac{\\text{Adjacent}}{\\text{Hypotenuse}} \\quad \\tan\\theta = \\frac{\\text{Opposite}}{\\text{Adjacent}}$$

### Key Angle Values
| Angle | sin | cos | tan |
|-------|-----|-----|-----|
| 0° | 0 | 1 | 0 |
| 30° | ½ | √3/2 | 1/√3 |
| 45° | √2/2 | √2/2 | 1 |
| 60° | √3/2 | ½ | √3 |
| 90° | 1 | 0 | undefined |

### Sine Rule
$$\\frac{a}{\\sin A} = \\frac{b}{\\sin B} = \\frac{c}{\\sin C}$$

### Cosine Rule
$$a^2 = b^2 + c^2 - 2bc\\cos A$$

**Worked Example:** Triangle with hypotenuse 10, angle 30°. Find opposite:
$$\\text{Opposite} = 10 \\times \\sin 30° = 10 \\times 0.5 = 5$$

> 💡 **Exam Tip:** Always check your calculator is in DEGREE mode (not radians) for UNEB exams.`;
  }

  if (q.match(/statistic|mean|median|mode|range|standard deviation|probability|histogram|frequency/)) {
    return `## 📊 Statistics & Probability ${levelNote}

### Measures of Central Tendency
Given data: 3, 5, 7, 7, 9, 11, 14

| Measure | Formula | Example |
|---------|---------|---------|
| **Mean** | $\\bar{x} = \\frac{\\sum x}{n}$ | $(3+5+7+7+9+11+14)/7 = 8$ |
| **Median** | Middle value (sorted) | 7 |
| **Mode** | Most frequent | 7 |
| **Range** | Max − Min | 14 − 3 = 11 |

### Standard Deviation
$$\\sigma = \\sqrt{\\frac{\\sum(x - \\bar{x})^2}{n}}$$

### Probability
$$P(A) = \\frac{\\text{Number of favourable outcomes}}{\\text{Total number of outcomes}}$$

- $P(A \\cup B) = P(A) + P(B) - P(A \\cap B)$ *(OR rule)*
- $P(A \\cap B) = P(A) \\times P(B)$ *(AND rule — independent events)*
- $0 \\leq P(A) \\leq 1$

### Types of Data
- **Discrete:** Countable values (e.g. number of students)
- **Continuous:** Measurable values (e.g. height, mass)

> 💡 **Exam Tip:** For grouped data, use class midpoints to calculate the mean.`;
  }

  // ── HISTORY & CRE ─────────────────────────────────────────────────────────
  if (q.match(/histor|ancient|civil|war|revolution|coloni|independence|empire|kingdom/)) {
    return `## 📜 History ${levelNote}

### What is History?
History is the systematic study and interpretation of past human events, societies, actions, and their causes and effects.

### Uganda's History — Key Milestones
| Period | Event |
|--------|-------|
| Pre-colonial | Kingdoms of Buganda, Bunyoro, Ankole, Toro |
| 1894 | Uganda declared a British Protectorate |
| 1900 | Uganda Agreement signed with Buganda |
| 1952 | Ben Kiwanuka founds Democratic Party (DP) |
| 1960 | Uganda National Congress (UNC) splits |
| **9 Oct 1962** | **Uganda gains Independence** |
| 1962–1966 | Sir Edward Mutesa II (President), Milton Obote (PM) |
| 1971 | Idi Amin Dada seizes power in coup |
| 1979 | Amin ousted; UNLF forms transitional government |
| 1986 | Yoweri Museveni captures Kampala; NRM takes power |

### African Independence Movements (O-Level)
- **Nationalism:** The desire of African people for self-rule
- **Pan-Africanism:** Unity of all African peoples (Kwame Nkrumah — Ghana)
- **First Independent African state:** **Ghana, 1957** (sub-Saharan Africa)
- **OAU:** Organisation of African Unity founded 1963, Addis Ababa

### Sources of History
Primary (diaries, artefacts, oral tradition) vs Secondary (textbooks, documentaries)

> 💡 **Exam Tip:** Structure History essays with: Introduction → Causes/Factors → Events → Effects → Conclusion.`;
  }

  // ── GEOGRAPHY ─────────────────────────────────────────────────────────────
  if (q.match(/geograph|climate|weather|erosion|soil|population|agricultur|mineral|river|lake victoria/)) {
    return `## 🌍 Geography ${levelNote}

### Uganda's Geography
- **Location:** East-Central Africa; straddles the Equator (1°N–4°S, 30°E–35°E)
- **Area:** 241,551 km² (including water bodies)
- **Neighbours:** Kenya (E), Tanzania (S), Rwanda (SW), DRC (W), South Sudan (N)
- **Capital:** Kampala
- **Major Lakes:** Victoria, Albert, Edward, Kyoga, George, Bunyonyi

### Climate of Uganda
| Type | Region | Rainfall | Temperature |
|------|--------|----------|-------------|
| Equatorial | South/Central | Bimodal (Mar-May, Oct-Dec) | 20–25°C |
| Modified equatorial | North | Unimodal (Apr-Oct) | 25–30°C |
| Semi-arid | North-East (Karamoja) | < 750mm/year | 30°C+ |

### Soil Erosion
**Agents:** Water, wind, glaciers, mass movement

**Types of Water Erosion:**
1. Splash erosion — raindrops hit bare soil
2. Sheet erosion — thin layer washed away
3. Rill erosion — small channels form
4. Gully erosion — deep channels cut (most severe)

**Prevention:** Terracing, mulching, cover crops, contour ploughing, afforestation

### Population
- Uganda population ~47 million (2024 est.)
- High growth rate ~3.6% per annum
- Youthful population (50%+ under 15 years)

> 💡 **Exam Tip:** Always use sketch maps where relevant — label clearly with a title, key, and north arrow.`;
  }

  // ── ICT / COMPUTER SCIENCE ────────────────────────────────────────────────
  if (q.match(/computer|ict|hardware|software|input|output|cpu|memory|ram|rom|internet|network|program|algorithm|spreadsheet/)) {
    return `## 💻 ICT & Computer Science ${levelNote}

### What is a Computer?
A computer is an **electronic device** that accepts data (input), processes it according to a set of instructions (program), and produces meaningful information (output).

### Main Parts of a Computer
| Component | Category | Function |
|-----------|----------|----------|
| Keyboard, Mouse | Input | Enter data |
| Monitor, Printer | Output | Display/print results |
| CPU (Processor) | Processing | Executes instructions |
| RAM | Primary Storage | Temporary working memory |
| ROM | Primary Storage | Stores boot instructions (permanent) |
| Hard Disk, USB | Secondary Storage | Permanent data storage |

### Software Types
- **System Software:** OS (Windows, Linux, macOS), Device drivers, Utilities
- **Application Software:** Word processors, Spreadsheets, Browsers, Games

### Computer Generations
| Gen | Period | Technology |
|-----|--------|------------|
| 1st | 1940s–1950s | Vacuum tubes |
| 2nd | 1950s–1960s | Transistors |
| 3rd | 1960s–1970s | Integrated Circuits |
| 4th | 1970s–present | Microprocessors (VLSI) |
| 5th | Present–future | AI, Quantum computing |

### Networks & Internet
- **LAN:** Local Area Network — within a building
- **WAN:** Wide Area Network — across cities/countries
- **Internet:** Global network of networks
- **WWW:** Collection of web pages accessed via HTTP/HTTPS

### Algorithms
A step-by-step instruction to solve a problem. Can be shown as:
- **Flowchart** (shapes: Start/Stop=Oval, Process=Rectangle, Decision=Diamond)
- **Pseudocode** (structured English)

> 💡 **Exam Tip:** Know the difference between RAM (volatile — lost when power off) and ROM (non-volatile — permanent).`;
  }

  // ── ECONOMICS / ENTREPRENEURSHIP ──────────────────────────────────────────
  if (q.match(/econom|supply|demand|market|inflation|gdp|trade|budget|entrepreneur|business|profit|loss/)) {
    return `## 💰 Economics & Entrepreneurship ${levelNote}

### Basic Economic Concepts
- **Scarcity:** Resources are limited but human wants are unlimited
- **Opportunity Cost:** The value of the next best alternative forgone
- **Factors of Production:** Land, Labour, Capital, Entrepreneurship

### Demand & Supply
**Law of Demand:** As price rises, quantity demanded falls (inverse relationship).
**Law of Supply:** As price rises, quantity supplied increases (direct relationship).

**Equilibrium Price:** Where demand = supply (market-clearing price)

### Types of Markets
| Market | Features | Example |
|--------|----------|---------|
| Perfect Competition | Many buyers/sellers, homogeneous goods | Agricultural markets |
| Monopoly | Single seller controls market | UMEME (electricity), NWC |
| Oligopoly | Few large firms dominate | Telecom companies (MTN, Airtel) |

### Inflation
**Definition:** A sustained general rise in the price level.

**Causes:** Demand-pull (excess demand), Cost-push (rising production costs)

**Effects:** Reduced purchasing power, fixed-income earners suffer, exchange rate depreciation

### Uganda Economy
- **Main exports:** Coffee, tea, fish, gold
- **Currency:** Uganda Shilling (UGX)
- **Key sector:** Agriculture employs ~70% of population
- **Financial regulator:** Bank of Uganda (BOU)

### Entrepreneurship
**Entrepreneur:** A person who organises and manages a business, taking financial risks.

**Qualities:** Risk-taker, innovative, determined, creative, leadership skills

**Types of Business:** Sole proprietorship, Partnership, Limited company (Ltd), Cooperative

> 💡 **Exam Tip:** Use diagrams (supply-demand curves) wherever possible in Economics exams.`;
  }

  // ── ENGLISH LANGUAGE ──────────────────────────────────────────────────────
  if (q.match(/english|grammar|noun|verb|adjective|adverb|tense|essay|comprehension|punctuation|sentence/)) {
    return `## ✍️ English Language ${levelNote}

### Parts of Speech
| Part | Definition | Example |
|------|------------|---------|
| **Noun** | Name of a person, place, thing | Kampala, student, book |
| **Pronoun** | Replaces a noun | he, she, it, they |
| **Verb** | Action or state word | run, is, think |
| **Adjective** | Describes a noun | beautiful, large, three |
| **Adverb** | Modifies verb/adjective | quickly, very, loudly |
| **Preposition** | Shows relationship | in, on, at, above |
| **Conjunction** | Joins clauses | and, but, because, although |
| **Interjection** | Exclamation | Oh! Alas! |

### Verb Tenses
| Tense | Example |
|-------|---------|
| Simple Present | She **reads** every day |
| Present Continuous | She **is reading** now |
| Simple Past | She **read** yesterday |
| Past Continuous | She **was reading** when I came |
| Simple Future | She **will read** tomorrow |
| Present Perfect | She **has read** the book |

### Essay Writing Structure
1. **Introduction** — Hook, background, thesis statement
2. **Body Paragraphs** — Topic sentence + Evidence + Explanation
3. **Conclusion** — Restate thesis, summarise, call to action

### Comprehension Tips
- Read passage twice before answering
- Answers must come from the passage
- Use your own words unless asked to quote
- Check word limits for summary questions

> 💡 **Exam Tip:** In UNEB, you lose marks for poor spelling, punctuation, and grammar even if your ideas are correct.`;
  }

  // ── ENTREPRENEURSHIP & LIFE SKILLS ────────────────────────────────────────
  if (q.match(/life skill|value|peer pressure|decision.mak|communication|conflict|citizen|human right/)) {
    return `## 🌟 Life Skills & Citizenship ${levelNote}

### Key Life Skills (Uganda NCDC Framework)
1. **Decision Making** — Identifying options, evaluating consequences, making wise choices
2. **Critical Thinking** — Analysing information objectively before drawing conclusions
3. **Creative Thinking** — Generating new ideas and innovative solutions
4. **Communication** — Expressing thoughts clearly (verbal, non-verbal, written)
5. **Interpersonal Relationships** — Building positive connections with others
6. **Empathy** — Understanding and sharing feelings of others
7. **Coping with Stress** — Managing pressure in healthy ways
8. **Coping with Emotions** — Recognising and regulating emotional responses

### Peer Pressure
- **Positive:** Encouraging study habits, sports participation
- **Negative:** Drugs, early sex, truancy, theft
- **How to resist:** Say no confidently, walk away, seek trusted adult help

### Human Rights (Uganda)
Based on the **1995 Uganda Constitution** and **UN Universal Declaration of Human Rights (1948)**:
- Right to life, liberty, and security
- Right to education
- Right to health
- Freedom of speech, worship, assembly
- Right to fair trial

### Good Citizenship
- Paying taxes
- Voting in elections
- Obeying laws and traffic rules
- Participating in community work (Luwalo)
- Protecting the environment

> 💡 **Exam Tip:** Use real-life examples from Uganda society to illustrate Life Skills answers.`;
  }

  // ── DEFAULT: Smart Academic Response ──────────────────────────────────────
  return `## 📚 AutoAssistant AI — Academic Response ${levelNote}

I received your question: **"${query}"**

While I work to find a precise curriculum-aligned answer for you, here is a structured study approach:

### 🔍 How to Study This Topic
1. **Locate it in your syllabus** — Check your ${isPrimary ? 'Primary curriculum booklet' : isALevel ? 'A-Level subject syllabus' : 'NCDC lower secondary syllabus'} for the exact topic/unit.
2. **Key definitions first** — Write out the main term(s) and their definitions in your own words.
3. **Ask "Why?" and "How?"** — Understanding the concept is more valuable than memorising facts.
4. **Draw diagrams** — Visual representation greatly aids recall (labelled diagrams score extra marks in UNEB).
5. **Past paper practice** — Download ${isPrimary ? 'PLE' : isALevel ? 'UACE' : 'UCE'} past papers from the **UNEB website** and practise timed questions.

### 💡 Uganda NCDC Study Tips for ${userLevel}
- **Continuous Assessment:** In O-Level NLSC, class work and practicals count — don't miss them!
- **Group Study:** Peer teaching reinforces understanding — teach a concept to a friend.
- **Exam Language:** UNEB uses command words like *Explain, Describe, Calculate, Distinguish, Evaluate* — know what each requires.
- **Time Management:** Allocate time per question in exams. Don't spend too long on one question.

### 📌 Try rephrasing your question with more detail, for example:
- *"What is [topic] in Biology S3?"*
- *"Explain the causes of [event] in History O-Level"*
- *"Solve [specific equation] step by step"*

Your question will get an even more detailed answer!`;
}


// ==========================================
// ==========================================
// 6. AUTOASSISTANT AI — MULTI-AGENT NCDC/UNEB ENGINE
// ==========================================

// ── NCDC Curriculum System Prompt Builder ───────────────────────────────────
function buildNCDCSystemPrompt(levelKey, levelLabel) {
  const examName = levelKey === 'primary' ? 'PLE (Primary Leaving Examinations)'
    : levelKey === 'alevel' ? 'UACE (Uganda Advanced Certificate of Education)'
    : 'UCE (Uganda Certificate of Education)';

  const curriculumContext = {
    primary: `
STUDENT LEVEL: Uganda Primary (P1–P7) preparing for ${examName} set by UNEB.
NCDC CURRICULUM SUBJECTS:
- Mathematics: Numbers, operations, fractions, decimals, percentages, algebra, geometry (shapes, area, perimeter, volume), data handling, money, time, measurement
- English Language: Grammar, reading comprehension, composition writing, punctuation, vocabulary, poetry
- Science: Plants, animals, human body, food & nutrition, simple machines, soil, water, weather, environment, health
- Social Studies: Uganda geography, communities, government, citizenship, East Africa, economic activities, history
- CRE/IRE: Bible/Islamic stories, values, church history in Uganda
PLE FORMAT: Four subjects; grades by aggregate (Div 1=4–12, Div 2=13–23, Div 3=24–29, Div 4=30–34)
STYLE: Very simple language, short sentences, Uganda real-life examples, relatable analogies.`,
    olevel: `
STUDENT LEVEL: Uganda O-Level (S1–S4) preparing for ${examName} set by UNEB.
NCDC CURRICULUM — New Lower Secondary Curriculum (NLSC):
- Mathematics: Sets, algebra, quadratic equations, simultaneous equations, matrices, trigonometry, statistics, probability, geometry, vectors, functions
- Physics: Motion, Newton's laws, energy, waves, light, sound, electricity (Ohm's law, circuits), magnetism, electromagnetism, thermal physics
- Chemistry: Atomic structure, periodic table, ionic/covalent bonding, acids/bases/salts, electrochemistry, organic chemistry, reaction rates, industrial chemistry
- Biology: Cell structure, photosynthesis, respiration, nutrition, transport, reproduction, genetics (Mendel), ecology, disease
- Geography: Map reading, earth structure, weathering, rivers, climate, Uganda geography, population, agriculture, minerals
- History: Pre-colonial East Africa, Uganda kingdoms, colonial period, independence, World Wars, African nationalism
- English: Comprehension, functional writing (letters, reports), grammar, oral skills, literature
- Economics: Demand/supply, national income, money/banking, trade, development
- Computer Studies: Hardware, software, networks, word processing, spreadsheets, internet
UCE FORMAT: Paper 1 (objective) + Paper 2 (structured/essay) + Paper 3 (practicals for sciences)
Grading: 3=Advanced, 2=Achieving, 1=Basic, U=Unachieved
UNEB TIPS: Show all working, state definitions clearly, use diagrams for sciences, write in structured points for essays.
STYLE: Detailed, step-by-step, use Uganda examples, include UNEB marking scheme guidance.`,
    alevel: `
STUDENT LEVEL: Uganda A-Level (S5–S6) preparing for ${examName} set by UNEB.
NCDC CURRICULUM — Upper Secondary:
- Pure Mathematics: Functions, trigonometry (identities, proofs), differentiation, integration, differential equations, vectors (2D/3D), matrices, complex numbers, series, coordinate geometry, numerical methods
- Applied Mathematics: Mechanics (statics, dynamics, circular motion, SHM), Statistics (distributions, hypothesis testing, regression)
- Physics: Dynamics, circular motion, thermal physics, waves & optics, electricity, modern physics (nuclear, photoelectric, relativity), electronics
- Chemistry: Physical (thermodynamics, equilibrium, kinetics, electrochemistry), Inorganic (transition metals, periodic trends), Organic (mechanisms, synthesis, spectroscopy)
- Biology: Biochemistry, genetics (linkage, DNA technology), ecology, physiology, evolution, microbiology, immunology
- Economics: Micro (demand/supply, market structures, elasticity), Macro (GDP, fiscal/monetary policy, inflation, BoP), Development economics, Uganda economic policy
- Computer Science: Algorithms, data structures, databases, networks, software engineering, digital logic
- History: European (1815–1939), Africa, Uganda, World History, historiography
UACE FORMAT: Paper 1 (structured/40%) + Paper 2 (essay/60%) + Paper 3 (practicals for sciences)
Grading: A=80%+(6pts), B=70–79%(5pts), C=60–69%(4pts), D=50–59%(3pts), E=40–49%(2pts), O=35–39%(1pt), F<35%(0pts)
STYLE: University-entrance depth, rigorous derivations, complete working, UNEB essay/paper strategies.`
  };

  const ctx = curriculumContext[levelKey] || curriculumContext.olevel;

  return `You are AutoAssistant AI — the official multi-agent academic research assistant for Alinda Digital Learners, a Uganda e-learning platform.

${ctx}

═══════════════════════════════════════════
MANDATORY RESPONSE STRUCTURE:
═══════════════════════════════════════════
Every answer MUST follow this structure:

1. ## 📚 [Topic Title]
   Brief 1-2 sentence overview

2. ## 🔍 Detailed Explanation
   - Full, comprehensive content
   - For Sciences/Maths: show ALL steps with explanations
   - For Humanities: include dates, people, causes, effects specific to Uganda/East Africa
   - Use ## sub-headings for each major concept
   - Use numbered lists for processes/steps
   - Use bullet points for facts/characteristics
   - Use **bold** for ALL key terms and definitions

3. ## 📝 Key Definitions
   Define every important term in the topic

4. ## 🧮 Worked Example (for Maths/Sciences)
   Or ## 📊 Case Study / Evidence (for Humanities)

5. ## 📌 Key Points to Remember
   5–8 concise bullet points of the most important facts

6. ## 💡 UNEB Exam Tips
   Specific guidance on how UNEB marks this topic
   Include common mistakes students make

NEVER give vague or brief answers. ALWAYS be comprehensive and detailed.
ALWAYS relate answers to the Uganda NCDC ${examName} context.`;
}

// ── Multi-Agent Cascade Request ──────────────────────────────────────────────
async function queryGemini(model, tool, systemPrompt, question, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: question }] }],
    generationConfig: { temperature: 0.25, maxOutputTokens: 3500, topP: 0.9 }
  };
  if (tool) body.tools = [tool];

  const r = await axios.post(url, body, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 45000
  });

  const cand = r.data && r.data.candidates && r.data.candidates[0];
  const parts = cand && cand.content && cand.content.parts;
  const text = parts ? parts.filter(p => p.text).map(p => p.text).join('\n') : '';
  if (!text || text.length < 30) throw new Error('Empty Gemini response');

  const gMeta = (cand && cand.groundingMetadata) || {};
  const seen = {};
  const sources = (gMeta.groundingChunks || [])
    .filter(c => c.web && c.web.uri && !seen[c.web.uri] && (seen[c.web.uri] = true))
    .map(c => {
      let dom = c.web.uri;
      try { dom = new URL(c.web.uri).hostname.replace('www.', ''); } catch (_) {}
      return { title: c.web.title || dom, url: c.web.uri, domain: dom };
    }).slice(0, 6);

  return { text: text.trim(), sources, queries: gMeta.webSearchQueries || [], webGrounded: tool !== null };
}

async function queryOpenAI(model, systemPrompt, question, apiKey) {
  const r = await axios.post('https://api.openai.com/v1/chat/completions', {
    model,
    messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: question }],
    temperature: 0.25,
    max_tokens: 3500
  }, {
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    timeout: 40000
  });

  const text = r.data && r.data.choices && r.data.choices[0] && r.data.choices[0].message && r.data.choices[0].message.content;
  if (!text || text.length < 30) throw new Error('Empty OpenAI response');
  return { text: text.trim(), sources: [], queries: [], webGrounded: false };
}

async function queryClaude(systemPrompt, question, apiKey) {
  const r = await axios.post('https://api.anthropic.com/v1/messages', {
    model: 'claude-3-haiku-20240307',
    max_tokens: 3500,
    system: systemPrompt,
    messages: [{ role: 'user', content: question }]
  }, {
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    },
    timeout: 40000
  });

  const text = r.data && r.data.content && r.data.content[0] && r.data.content[0].text;
  if (!text || text.length < 30) throw new Error('Empty Claude response');
  return { text: text.trim(), sources: [], queries: [], webGrounded: false };
}

router.post('/ai/research', verifyToken, async (req, res) => {
  const { query, levelKey, agent } = req.body;
  const cleanQuery = (query || '').trim();

  if (!cleanQuery || cleanQuery.length < 2) {
    return res.status(400).json({ message: 'Please enter a valid question.' });
  }

  const GEMINI_KEY  = process.env.GEMINI_API_KEY;
  const OPENAI_KEY  = process.env.OPENAI_API_KEY;
  const CLAUDE_KEY  = process.env.ANTHROPIC_API_KEY;

  const userLevel = req.user?.level || '';
  const resolvedKey = levelKey || (
    /^p\d|primary/i.test(userLevel) ? 'primary' :
    /^s[56]|a.level/i.test(userLevel) ? 'alevel' : 'olevel'
  );

  const levelLabels = { primary: 'Primary (PLE)', olevel: 'O-Level (UCE)', alevel: 'A-Level (UACE)' };
  const lvlLabel = (levelLabels[resolvedKey] || 'O-Level (UCE)') + (userLevel ? ' · ' + userLevel : '');

  const sysPrompt = buildNCDCSystemPrompt(resolvedKey, lvlLabel);
  const question = `Provide a detailed, NCDC-curriculum-aligned academic answer for a Uganda ${lvlLabel} student.\n\nQUESTION: ${cleanQuery}`;

  // 1. Build all possible agent targets
  const allAgents = {
    gemini: {
      name: 'Gemini 2.5 Flash',
      icon: 'gemini',
      fn: () => queryGemini('gemini-2.5-flash', { google_search: {} }, sysPrompt, question, GEMINI_KEY)
    },
    geminiBackup: {
      name: 'Gemini Flash Latest',
      icon: 'gemini',
      fn: () => queryGemini('gemini-flash-latest', { google_search: {} }, sysPrompt, question, GEMINI_KEY)
    },
    openai: {
      name: 'GPT-4o (ChatGPT)',
      icon: 'openai',
      fn: () => queryOpenAI('gpt-4o', sysPrompt, question, OPENAI_KEY)
    },
    openaiBackup: {
      name: 'GPT-3.5 Turbo',
      icon: 'openai',
      fn: () => queryOpenAI('gpt-3.5-turbo', sysPrompt, question, OPENAI_KEY)
    },
    claude: {
      name: 'Claude 3 Haiku',
      icon: 'claude',
      fn: () => queryClaude(sysPrompt, question, CLAUDE_KEY)
    },
    copilot: {
      name: 'Copilot (Bing Grounded)',
      icon: 'copilot',
      fn: () => queryGemini('gemini-2.5-flash', { google_search: {} }, sysPrompt, `Search Bing and provide a detailed academic answer:\n\n${cleanQuery}`, GEMINI_KEY)
    }
  };

  // Determine prioritised agents list based on selection
  const priorityList = [];
  const selected = (agent || 'auto').toLowerCase();

  if (selected === 'gemini') {
    if (GEMINI_KEY) { priorityList.push(allAgents.gemini); priorityList.push(allAgents.geminiBackup); }
  } else if (selected === 'openai' || selected === 'chatgpt') {
    if (OPENAI_KEY) { priorityList.push(allAgents.openai); priorityList.push(allAgents.openaiBackup); }
  } else if (selected === 'claude') {
    if (CLAUDE_KEY) { priorityList.push(allAgents.claude); }
  } else if (selected === 'copilot') {
    if (GEMINI_KEY) { priorityList.push(allAgents.copilot); }
  }

  // Add remaining fallback options in default order
  const defaultOrder = ['gemini', 'copilot', 'openai', 'claude', 'geminiBackup', 'openaiBackup'];
  defaultOrder.forEach(key => {
    const act = allAgents[key];
    if (act && !priorityList.some(p => p.name === act.name)) {
      // Check if keys exist
      if (key.startsWith('gemini') || key === 'copilot') {
        if (GEMINI_KEY) priorityList.push(act);
      } else if (key.startsWith('openai')) {
        if (OPENAI_KEY) priorityList.push(act);
      } else if (key === 'claude') {
        if (CLAUDE_KEY) priorityList.push(act);
      }
    }
  });

  // Try each agent in our prioritized cascade
  for (const act of priorityList) {
    try {
      console.log(`[AutoAssistant] Trying ${act.name} (Selected: ${selected}) for: "${cleanQuery.slice(0, 60)}"`);
      const result = await act.fn();
      console.log(`[AutoAssistant] ${act.name} OK — ${result.text.length} chars | ${result.sources.length} sources`);

      return res.json({
        answer: result.text,
        agent: act.name,
        agentIcon: act.icon,
        source: act.icon === 'gemini' ? 'gemini' : act.icon === 'openai' ? 'openai' : act.icon === 'claude' ? 'claude' : 'copilot',
        level: lvlLabel,
        levelKey: resolvedKey,
        webSources: result.sources,
        searchQueries: result.queries,
        webGrounded: result.webGrounded
      });
    } catch (err) {
      const errMsg = (err.response && err.response.data && JSON.stringify(err.response.data).slice(0, 200)) || err.message;
      console.error(`[AutoAssistant] ${act.name} failed: ${errMsg}`);
    }
  }

  // ── FINAL FALLBACK: Local Synthesis Academic Database ───────────────────
  console.log(`[AutoAssistant] All cloud LLM agents failed or rate-limited. Falling back to Local Academic Engine...`);
  try {
    const builtInAnswer = builtInAcademicEngine(cleanQuery, userLevel);
    
    // Auto-extract references from the local answer text if any exist
    const webSources = [];
    const urlRx = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/g;
    const seenU = {};
    (builtInAnswer.match(urlRx) || []).forEach(u => {
      if (!seenU[u] && webSources.length < 3) {
        seenU[u] = true;
        let dom = u;
        try { dom = new URL(u).hostname.replace('www.',''); } catch(_) {}
        webSources.push({ title: dom, url: u, domain: dom });
      }
    });

    return res.json({
      answer: builtInAnswer,
      agent: 'Local Academic Engine',
      agentIcon: 'openai', // fall back to standard icon
      source: 'openai',
      level: lvlLabel,
      levelKey: resolvedKey,
      webSources,
      searchQueries: [],
      webGrounded: false
    });
  } catch (fallbackErr) {
    console.error(`[AutoAssistant] Local fallback failed: ${fallbackErr.message}`);
    return res.status(503).json({ message: 'AutoAssistant is temporarily unavailable. Please try again in a moment.' });
  }
});
// ==========================================
// 7. PERFORMANCE REPORTS (UGANDA GRADING CALCULATIONS)
// ==========================================
router.get('/performance/report/:studentId', verifyToken, async (req, res) => {
  try {
    const student = await User.findById(req.params.studentId);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    // Retrieve all submissions by this student
    const allSubs = await Submission.findAll({ studentId: req.params.studentId });
    const markedSubs = allSubs.filter(s => s.isMarked);

    // Retrieve all activities to map subjects
    const activities = await Activity.findAll({});
    const subjects = await Subject.findAll({});

    // Group scores by subject
    const subjectGrades = {};

    for (const sub of markedSubs) {
      const act = activities.find(a => a.id == sub.activityId);
      if (!act) continue;

      const subject = subjects.find(s => s.id == act.subjectId);
      if (!subject) continue;

      if (!subjectGrades[subject.name]) {
        subjectGrades[subject.name] = {
          subjectId: subject.id,
          subjectName: subject.name,
          className: subject.className,
          level: subject.level,
          scores: []
        };
      }
      subjectGrades[subject.name].scores.push(sub.score);
    }

    // Now calculate Uganda grade metrics per subject
    const reportData = Object.values(subjectGrades).map(subject => {
      const totalScore = subject.scores.reduce((a, b) => a + b, 0);
      const average = subject.scores.length > 0 ? (totalScore / subject.scores.length) : 0;
      
      let grade = '';
      let descriptor = '';
      let pointValue = 0;

      if (subject.level === 'Primary') {
        // Primary Grading PLE: Divisions & D1-U
        // average is standard 0-100 mark
        const avg = Math.round(average);
        if (avg >= 90) { grade = 'D1'; descriptor = 'Distinction 1'; pointValue = 1; }
        else if (avg >= 80) { grade = 'D2'; descriptor = 'Distinction 2'; pointValue = 2; }
        else if (avg >= 70) { grade = 'C3'; descriptor = 'Credit 3'; pointValue = 3; }
        else if (avg >= 60) { grade = 'C4'; descriptor = 'Credit 4'; pointValue = 4; }
        else if (avg >= 55) { grade = 'C5'; descriptor = 'Credit 5'; pointValue = 5; }
        else if (avg >= 50) { grade = 'C6'; descriptor = 'Credit 6'; pointValue = 6; }
        else if (avg >= 45) { grade = 'P7'; descriptor = 'Pass 7'; pointValue = 7; }
        else if (avg >= 40) { grade = 'P8'; descriptor = 'Pass 8'; pointValue = 8; }
        else { grade = 'F9'; descriptor = 'Fail 9'; pointValue = 9; }
      } 
      else if (subject.level === 'O-Level') {
        // NLSC Uganda (New Lower Secondary): Continuous Competency rating 1 to 3
        const avg = Math.round(average * 10) / 10;
        if (avg >= 2.5) { grade = '3 (Advanced)'; descriptor = 'Outstanding / Excellent'; pointValue = 3; }
        else if (avg >= 1.5) { grade = '2 (Achieving)'; descriptor = 'Intermediate / Achieving'; pointValue = 2; }
        else if (avg >= 0.5) { grade = '1 (Basic)'; descriptor = 'Basic / Beginning'; pointValue = 1; }
        else { grade = 'U (Unachieved)'; descriptor = 'Remedial Help Needed'; pointValue = 0; }
      } 
      else {
        // A-Level Uganda (UACE): Principal points scale A to F
        // average is standard 0-100 mark
        const avg = Math.round(average);
        if (avg >= 80) { grade = 'A'; descriptor = 'Excellent (Principal Pass)'; pointValue = 6; }
        else if (avg >= 70) { grade = 'B'; descriptor = 'Very Good (Principal Pass)'; pointValue = 5; }
        else if (avg >= 60) { grade = 'C'; descriptor = 'Good (Principal Pass)'; pointValue = 4; }
        else if (avg >= 50) { grade = 'D'; descriptor = 'Satisfactory (Principal Pass)'; pointValue = 3; }
        else if (avg >= 40) { grade = 'E'; descriptor = 'Pass (Principal Pass)'; pointValue = 2; }
        else if (avg >= 35) { grade = 'O'; descriptor = 'Subsidiary Pass'; pointValue = 1; }
        else { grade = 'F'; descriptor = 'Fail'; pointValue = 0; }
      }

      return {
        subjectName: subject.subjectName,
        className: subject.className,
        level: subject.level,
        activitiesCount: subject.scores.length,
        averageScore: Math.round(average * 100) / 100,
        grade,
        descriptor,
        pointValue
      };
    });

    // Compile Overall Performance Summary
    let totalPoints = reportData.reduce((acc, curr) => acc + curr.pointValue, 0);
    let summaryDescriptor = '';
    
    if (student.level && student.level.startsWith('P')) {
      // Primary: Calculate PLE division
      // Division is determined by summing point values of 4 core subjects
      const primaryCount = reportData.length;
      if (primaryCount >= 4) {
        if (totalPoints <= 12) summaryDescriptor = 'Division 1 (First Grade)';
        else if (totalPoints <= 24) summaryDescriptor = 'Division 2 (Second Grade)';
        else if (totalPoints <= 28) summaryDescriptor = 'Division 3 (Third Grade)';
        else if (totalPoints <= 32) summaryDescriptor = 'Division 4 (Fourth Grade)';
        else summaryDescriptor = 'Division U (Ungraded)';
      } else {
        summaryDescriptor = `PLE Progressing (Registered: ${primaryCount}/4 subjects)`;
      }
    } else if (student.level && (student.level.startsWith('S1') || student.level.startsWith('S2') || student.level.startsWith('S3') || student.level.startsWith('S4'))) {
      // O-Level NLSC: Competency Average Summary
      const averageCompetency = reportData.length > 0 ? (totalPoints / reportData.length) : 0;
      summaryDescriptor = `O-Level average competency: ${Math.round(averageCompetency * 10) / 10} / 3.0`;
    } else {
      // A-Level: Sum principal points (max 20 points: e.g. 3 subjects * 6 = 18 + General paper/Sub ICT)
      summaryDescriptor = `A-Level aggregate points: ${totalPoints} Points`;
    }

    res.json({
      studentName: student.name,
      level: student.level,
      summaryDescriptor,
      subjects: reportData
    });
  } catch (err) {
    res.status(500).json({ message: 'Performance calculation failed', error: err.message });
  }
});

// ==========================================
module.exports = router;
