const { AuditLog } = require('../models');

async function writeAuditLog({ actorId, action, entityType, entityId, before = null, after = null }) {
  if (!actorId || !action || !entityType || !entityId) {
    return null;
  }

  return AuditLog.create({
    actorId,
    action,
    entityType,
    entityId,
    before,
    after,
  });
}

module.exports = {
  writeAuditLog,
};
