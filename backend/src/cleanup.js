require('dotenv').config();
const mongoose = require('mongoose');

const KEEP_INSTANCE = 'fb6bcc29-8465-41c5-803d-c95827771695';

async function cleanup() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pulse');
  const db = mongoose.connection.db;

  const r = await Promise.all([
    db.collection('events').deleteMany({ instanceId: { $ne: KEEP_INSTANCE } }),
    db.collection('loanevents').deleteMany({}),
    db.collection('alerts').deleteMany({}),
    db.collection('instances').deleteMany({ instanceId: { $ne: KEEP_INSTANCE } })
  ]);

  console.log('Cleaned seed data:');
  console.log('  Events removed:', r[0].deletedCount);
  console.log('  Loan events removed:', r[1].deletedCount);
  console.log('  Alerts removed:', r[2].deletedCount);
  console.log('  Instances removed:', r[3].deletedCount);

  const remaining = await db.collection('events').countDocuments({ instanceId: KEEP_INSTANCE });
  console.log('  CapitalXB events remaining:', remaining);

  await mongoose.disconnect();
}

cleanup().catch(console.error);
