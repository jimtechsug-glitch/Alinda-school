require('dotenv').config();
const { syncDB, User, Subject, Material, Activity, Submission, Lesson, Feedback, ChatbotResponse, Combination, Tenant, ActivationKey } = require('./models');
const { connectDB } = require('./db');
const bcrypt = require('bcryptjs');

async function migrate() {
  try {
    console.log('Connecting to DB and syncing models...');
    await connectDB();
    await syncDB();

    console.log('Checking for existing Default School tenant...');
    let defaultTenant = await Tenant.findOne({ inviteCode: 'DEFAULT2026' });
    if (!defaultTenant) {
      console.log('Creating Default School tenant...');
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 10); // 10 year trial for default legacy school

      defaultTenant = await Tenant.create({
        name: 'Default Legacy School',
        inviteCode: 'DEFAULT2026',
        trialStartDate: new Date(),
        trialEndDate: futureDate,
        status: 'active',
        revenueGenerated: 0
      });
      console.log(`Created Default School with ID: ${defaultTenant.id}`);
    } else {
      console.log(`Default School already exists with ID: ${defaultTenant.id}`);
    }

    const tenantId = defaultTenant.id;

    console.log('Checking for superadmin account...');
    const existingSuperAdmin = await User.findOne({ username: 'superadmin' });
    if (!existingSuperAdmin) {
      console.log('Creating superadmin account...');
      const hashedPassword = await bcrypt.hash('superadmin123', 10);
      await User.create({
        name: 'Super Admin',
        phone: '0000000000',
        username: 'superadmin',
        password: hashedPassword,
        role: 'superadmin',
        isApproved: true,
        level: null,
        combination: null,
        profile: 'System Master',
        tenantId: null // Superadmin belongs to no specific tenant
      });
      console.log('Superadmin created (username: superadmin, password: superadmin123)');
    } else {
      console.log('Superadmin already exists.');
    }

    console.log('Migrating existing Users...');
    const users = await User.findAll({});
    let updatedUsers = 0;
    for (const user of users) {
      if (user.role !== 'superadmin' && !user.tenantId) {
        await User.update(user.id, { tenantId });
        updatedUsers++;
      }
    }
    console.log(`Updated ${updatedUsers} users with tenantId.`);

    console.log('Migrating existing Subjects...');
    const subjects = await Subject.findAll({});
    let updatedSubjects = 0;
    for (const sub of subjects) {
      if (!sub.tenantId) {
        await Subject.update(sub.id, { tenantId });
        updatedSubjects++;
      }
    }
    console.log(`Updated ${updatedSubjects} subjects with tenantId.`);

    const modelsToMigrate = [
      { name: 'Material', obj: Material },
      { name: 'Activity', obj: Activity },
      { name: 'Submission', obj: Submission },
      { name: 'Lesson', obj: Lesson },
      { name: 'Combination', obj: Combination }
    ];

    for (const m of modelsToMigrate) {
      console.log(`Migrating existing ${m.name}s...`);
      const items = await m.obj.findAll({});
      let updatedItems = 0;
      for (const item of items) {
        if (!item.tenantId) {
          await m.obj.update(item.id, { tenantId });
          updatedItems++;
        }
      }
      console.log(`Updated ${updatedItems} ${m.name}s with tenantId.`);
    }

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
