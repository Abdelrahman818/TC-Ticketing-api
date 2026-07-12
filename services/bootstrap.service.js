const { Stage } = require('../models');

const defaultStages = [
  { name: 'Inbox', key: 'inbox', order: 1, color: '#64748b', isDefault: true, isFinal: false },
  { name: 'In Progress', key: 'in_progress', order: 2, color: '#2563eb', isDefault: false, isFinal: false },
  { name: 'Canceled', key: 'canceled', order: 3, color: '#dc2626', isDefault: false, isFinal: true },
  { name: 'Done', key: 'done', order: 4, color: '#16a34a', isDefault: false, isFinal: true },
];

async function ensureDefaultStages() {
  const existingCount = await Stage.countDocuments();
  if (existingCount > 0) {
    return;
  }

  await Stage.insertMany(defaultStages);
}

module.exports = {
  ensureDefaultStages,
};
