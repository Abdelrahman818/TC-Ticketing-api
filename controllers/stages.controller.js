const { Stage, Ticket } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');
const HttpError = require('../utils/httpError');
const { writeAuditLog } = require('../utils/audit');

async function clearOtherDefaultStages(stageId) {
  await Stage.updateMany({ _id: { $ne: stageId } }, { $set: { isDefault: false } });
}

const createStage = asyncHandler(async (req, res) => {
  const stage = await Stage.create(req.body);
  if (stage.isDefault) {
    await clearOtherDefaultStages(stage._id);
  }
  await writeAuditLog({
    actorId: req.user._id,
    action: 'stage_created',
    entityType: 'stage',
    entityId: stage._id,
    after: stage.toObject(),
  });
  return success(res, 'Stage created successfully', { stage }, 201);
});

const getStages = asyncHandler(async (req, res) => {
  const role = req.user?.role || 'employee';
  const stages = await Stage.find({
    isActive: { $ne: false },
    $or: [{ visibleToRoles: { $in: [role] } }, { visibleToRoles: { $exists: false } }],
  }).sort({ order: 1, createdAt: 1 });

  return success(res, 'Stages fetched successfully', { stages });
});

const updateStage = asyncHandler(async (req, res) => {
  const stage = await Stage.findById(req.params.stageId);
  if (!stage) {
    throw new HttpError(404, 'Stage was not found', 'STAGE_NOT_FOUND');
  }
  const before = stage.toObject();
  Object.assign(stage, req.body);
  await stage.save();
  if (stage.isDefault) {
    await clearOtherDefaultStages(stage._id);
  }
  await writeAuditLog({
    actorId: req.user._id,
    action: 'stage_updated',
    entityType: 'stage',
    entityId: stage._id,
    before,
    after: stage.toObject(),
  });
  return success(res, 'Stage updated successfully', { stage });
});

const reorderStages = asyncHandler(async (req, res) => {
  await Promise.all(
    req.body.stages.map((stage) => Stage.updateOne({ _id: stage.stageId }, { $set: { order: stage.order } }))
  );
  await writeAuditLog({
    actorId: req.user._id,
    action: 'stages_reordered',
    entityType: 'stage',
    entityId: req.body.stages[0].stageId,
    after: req.body.stages,
  });
  return success(res, 'Stages reordered successfully');
});

const deleteStage = asyncHandler(async (req, res) => {
  const stage = await Stage.findById(req.params.stageId);
  if (!stage) {
    throw new HttpError(404, 'Stage was not found', 'STAGE_NOT_FOUND');
  }

  const ticketsUsingStage = await Ticket.countDocuments({ statusId: stage._id });
  const before = stage.toObject();

  if (ticketsUsingStage > 0) {
    stage.isActive = false;
    await stage.save();
    await writeAuditLog({
      actorId: req.user._id,
      action: 'stage_deactivated',
      entityType: 'stage',
      entityId: stage._id,
      before,
      after: stage.toObject(),
    });
    return success(res, 'Stage deactivated successfully');
  }

  await Stage.deleteOne({ _id: stage._id });
  await writeAuditLog({
    actorId: req.user._id,
    action: 'stage_deleted',
    entityType: 'stage',
    entityId: stage._id,
    before,
  });
  return success(res, 'Stage deleted successfully');
});

module.exports = {
  createStage,
  deleteStage,
  getStages,
  reorderStages,
  updateStage,
};
