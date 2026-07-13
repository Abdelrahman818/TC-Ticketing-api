const mongoose = require('mongoose');
const { Comment, Stage, Ticket } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');
const HttpError = require('../utils/httpError');
const { writeAuditLog } = require('../utils/audit');
const { uploadImage, deleteImage } = require('../utils/cloudinary');
const { buildTicketScopeQuery, canAccessTicket, assertCanAssignUser } = require('../services/access.service');

async function getDefaultStage() {
  let stage = await Stage.findOne({ isDefault: true, isActive: true }).sort({ order: 1 });
  if (!stage) {
    stage = await Stage.findOne({ isActive: true }).sort({ order: 1 });
  }
  if (!stage) {
    stage = await Stage.create({
      name: 'Inbox',
      key: 'inbox',
      order: 1,
      color: '#64748b',
      isDefault: true,
    });
  }
  return stage;
}

async function getNextTicketNumber() {
  const latestTicket = await Ticket.findOne().sort({ ticketNumber: -1 }).select('ticketNumber');
  return (latestTicket?.ticketNumber || 1000) + 1;
}

function buildDateQuery(query) {
  const createdAt = {};
  if (query.fromDate) {
    createdAt.$gte = new Date(query.fromDate);
  }
  if (query.toDate) {
    createdAt.$lte = new Date(query.toDate);
  }
  return Object.keys(createdAt).length ? { createdAt } : {};
}

function buildTicketFilters(query) {
  const filters = {
    ...buildDateQuery(query),
  };

  if (!query.includeArchived) {
    filters.isArchived = false;
  }
  if (query.statusId) {
    filters.statusId = query.statusId;
  }
  if (query.assignedUserId) {
    filters.assignedUserId = query.assignedUserId;
  }
  if (query.assignedDepartmentId) {
    filters.assignedDepartmentId = query.assignedDepartmentId;
  }
  if (query.priority) {
    filters.priority = query.priority;
  }
  if (query.search) {
    const numericSearch = Number(query.search);
    filters.$or = [
      { title: { $regex: query.search, $options: 'i' } },
      { description: { $regex: query.search, $options: 'i' } },
    ];

    if (!Number.isNaN(numericSearch)) {
      filters.$or.push({ ticketNumber: numericSearch });
    }
  }

  return filters;
}

async function getScopedTicketOrThrow(user, ticketId) {
  if (!mongoose.Types.ObjectId.isValid(ticketId)) {
    throw new HttpError(400, 'Invalid ticket id', 'INVALID_ID');
  }

  const ticket = await Ticket.findById(ticketId);
  if (!ticket) {
    throw new HttpError(404, 'Ticket was not found', 'TICKET_NOT_FOUND');
  }

  if (!(await canAccessTicket(user, ticket))) {
    throw new HttpError(403, 'You do not have permission to access this ticket', 'FORBIDDEN');
  }

  return ticket;
}

function assertCanModifyTicketPhotos(user, ticket) {
  if (user.role === 'employee' && String(ticket.assignedUserId || '') !== String(user._id)) {
    throw new HttpError(403, 'Employees can modify photos only on tickets directly assigned to them', 'FORBIDDEN');
  }
}

const createTicket = asyncHandler(async (req, res) => {
  const defaultStage = req.body.statusId ? await Stage.findById(req.body.statusId) : await getDefaultStage();

  if (!defaultStage || !defaultStage.isActive) {
    throw new HttpError(400, 'Ticket status must reference an active stage', 'INVALID_STAGE');
  }

  let assignedUserId = req.user.role === 'employee' ? null : (req.body.assignedUserId || null);
  let assignedDepartmentId = req.body.assignedDepartmentId || req.user.departmentId || null;

  if (req.user.role === 'supervisor' && req.body.assignedDepartmentId && String(req.body.assignedDepartmentId) !== String(req.user.departmentId)) {
    throw new HttpError(403, 'Supervisors can assign tickets only inside their department', 'FORBIDDEN');
  }

  if (assignedUserId) {
    await assertCanAssignUser(req.user, assignedUserId, assignedDepartmentId);
  }

  const history = [
    {
      action: 'created',
      toStatusId: defaultStage._id,
      changedBy: req.user._id,
      note: 'Ticket created',
    },
  ];

  if (assignedUserId) {
    history.push({
      action: 'assigned',
      changedBy: req.user._id,
      note: 'Assigned on creation',
    });
  }

  const ticket = await Ticket.create({
    ticketNumber: await getNextTicketNumber(),
    title: req.body.title,
    description: req.body.description,
    creatorId: req.user._id,
    assignedUserId,
    assignedDepartmentId,
    statusId: defaultStage._id,
    priority: req.body.priority,
    type: req.body.type,
    dueDate: req.body.dueDate || null,
    tags: req.body.tags,
    history,
  });

  await writeAuditLog({
    actorId: req.user._id,
    action: 'ticket_created',
    entityType: 'ticket',
    entityId: ticket._id,
    after: ticket.toObject(),
  });

  return success(res, 'Ticket created successfully', { ticket }, 201);
});

const getTickets = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const skip = (page - 1) * limit;
  const scopeQuery = await buildTicketScopeQuery(req.user);
  const filters = buildTicketFilters(req.query);
  const finalQuery = Object.keys(scopeQuery).length ? { $and: [scopeQuery, filters] } : filters;

  const [items, totalItems] = await Promise.all([
    Ticket.find(finalQuery)
      .populate('assignedUserId', 'name email role')
      .populate('assignedDepartmentId', 'name')
      .populate('statusId', 'name key order color isFinal')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Ticket.countDocuments(finalQuery),
  ]);

  return success(res, 'Tickets fetched successfully', {
    items,
    pagination: {
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit) || 1,
      hasNextPage: page * limit < totalItems,
      hasPrevPage: page > 1,
    },
  });
});

const getTicketById = asyncHandler(async (req, res) => {
  const ticket = await getScopedTicketOrThrow(req.user, req.params.ticketId);

  if (req.user.role === 'employee' && !ticket.assignedUserId && ticket.assignedDepartmentId && String(ticket.assignedDepartmentId) === String(req.user.departmentId)) {
    const before = ticket.toObject();
    ticket.assignedUserId = req.user._id;
    ticket.history.push({
      action: 'assigned',
      changedBy: req.user._id,
      note: 'Auto-assigned from inbox',
    });
    await ticket.save();

    await writeAuditLog({
      actorId: req.user._id,
      action: 'ticket_assigned',
      entityType: 'ticket',
      entityId: ticket._id,
      before,
      after: ticket.toObject(),
    });
  }

  await ticket.populate([
    { path: 'creatorId', select: 'name email role' },
    { path: 'assignedUserId', select: 'name email role' },
    { path: 'assignedDepartmentId', select: 'name' },
    { path: 'statusId', select: 'name key order color isFinal' },
    { path: 'history.changedBy', select: 'name role' },
    { path: 'history.fromStatusId', select: 'name key' },
    { path: 'history.toStatusId', select: 'name key' },
  ]);

  return success(res, 'Ticket fetched successfully', { ticket });
});

const getTicketPhotos = asyncHandler(async (req, res) => {
  const ticket = await getScopedTicketOrThrow(req.user, req.params.ticketId);
  return success(res, 'Ticket photos fetched successfully', { photos: ticket.photos || [] });
});

const uploadTicketPhoto = asyncHandler(async (req, res) => {
  const ticket = await getScopedTicketOrThrow(req.user, req.params.ticketId);
  assertCanModifyTicketPhotos(req.user, ticket);

  if (!req.file || !req.file.buffer) {
    throw new HttpError(400, 'No photo file was provided', 'PHOTO_REQUIRED');
  }

  const result = await uploadImage(req.file.buffer, req.file.originalname, `tickets/${ticket._id}`);
  const photo = {
    publicId: result.public_id,
    url: result.secure_url || result.url,
    filename: req.file.originalname,
    contentType: req.file.mimetype,
    size: req.file.size,
    caption: typeof req.body.caption === 'string' ? req.body.caption.trim() : '',
    uploadedBy: req.user._id,
    createdAt: new Date(),
  };

  ticket.photos = ticket.photos || [];
  ticket.photos.push(photo);
  await ticket.save();

  const savedPhoto = ticket.photos[ticket.photos.length - 1];
  await writeAuditLog({
    actorId: req.user._id,
    action: 'ticket_photo_uploaded',
    entityType: 'ticket',
    entityId: ticket._id,
    after: ticket.toObject(),
  });

  return success(res, 'Ticket photo uploaded successfully', { photo: savedPhoto }, 201);
});

const deleteTicketPhoto = asyncHandler(async (req, res) => {
  const ticket = await getScopedTicketOrThrow(req.user, req.params.ticketId);
  assertCanModifyTicketPhotos(req.user, ticket);

  const photo = ticket.photos?.id(req.params.photoId);
  if (!photo) {
    throw new HttpError(404, 'Ticket photo not found', 'PHOTO_NOT_FOUND');
  }

  const before = ticket.toObject();
  await deleteImage(photo.publicId);
  ticket.photos = ticket.photos.filter((item) => String(item._id) !== String(req.params.photoId));
  await ticket.save();

  await writeAuditLog({
    actorId: req.user._id,
    action: 'ticket_photo_deleted',
    entityType: 'ticket',
    entityId: ticket._id,
    before,
    after: ticket.toObject(),
  });

  return success(res, 'Ticket photo deleted successfully', { photoId: req.params.photoId });
});

const updateTicket = asyncHandler(async (req, res) => {
  const ticket = await getScopedTicketOrThrow(req.user, req.params.ticketId);

  if (req.user.role === 'employee' && String(ticket.assignedUserId || '') !== String(req.user._id)) {
    throw new HttpError(403, 'Employees can update only tickets directly assigned to them', 'FORBIDDEN');
  }

  const before = ticket.toObject();
  Object.assign(ticket, req.body);
  ticket.history.push({
    action: 'updated',
    changedBy: req.user._id,
    note: 'Ticket fields updated',
  });
  await ticket.save();

  await writeAuditLog({
    actorId: req.user._id,
    action: 'ticket_updated',
    entityType: 'ticket',
    entityId: ticket._id,
    before,
    after: ticket.toObject(),
  });

  return success(res, 'Ticket updated successfully', { ticket });
});

const changeTicketStatus = asyncHandler(async (req, res) => {
  const ticket = await getScopedTicketOrThrow(req.user, req.params.ticketId);
  const stage = await Stage.findById(req.body.statusId);

  if (!stage || !stage.isActive) {
    throw new HttpError(400, 'Ticket status must reference an active stage', 'INVALID_STAGE');
  }

  const before = ticket.toObject();
  const fromStatusId = ticket.statusId;
  ticket.statusId = stage._id;
  ticket.history.push({
    action: 'status_changed',
    fromStatusId,
    toStatusId: stage._id,
    changedBy: req.user._id,
    note: req.body.note || '',
  });
  await ticket.save();

  await writeAuditLog({
    actorId: req.user._id,
    action: 'ticket_status_changed',
    entityType: 'ticket',
    entityId: ticket._id,
    before,
    after: ticket.toObject(),
  });

  return success(res, 'Ticket status updated successfully', { ticket });
});

const assignTicket = asyncHandler(async (req, res) => {
  const ticket = await getScopedTicketOrThrow(req.user, req.params.ticketId);

  let newAssignedUserId = req.body.assignedUserId || null;
  let newAssignedDepartmentId = req.body.assignedDepartmentId || null;

  if (req.user.role === 'employee') {
    // Employees can assign tickets to themselves, but not to others
    if (String(req.body.assignedUserId || '') === String(req.user._id)) {
      newAssignedUserId = req.user._id;
    } else {
      newAssignedUserId = null;
    }
  } else if (req.user.role === 'supervisor') {
    const canAssignDepartment =
      !req.body.assignedDepartmentId || String(req.body.assignedDepartmentId) === String(req.user.departmentId);
    if (!canAssignDepartment) {
      throw new HttpError(403, 'Supervisors can assign tickets only inside their department', 'FORBIDDEN');
    }
  }

  if (newAssignedUserId) {
    await assertCanAssignUser(req.user, newAssignedUserId, newAssignedDepartmentId || ticket.assignedDepartmentId);
  }

  const before = ticket.toObject();
  ticket.assignedUserId = newAssignedUserId;
  ticket.assignedDepartmentId = newAssignedDepartmentId;
  ticket.history.push({
    action: 'assigned',
    changedBy: req.user._id,
    note: req.body.note || '',
  });
  await ticket.save();

  await writeAuditLog({
    actorId: req.user._id,
    action: 'ticket_assigned',
    entityType: 'ticket',
    entityId: ticket._id,
    before,
    after: ticket.toObject(),
  });

  return success(res, 'Ticket assigned successfully', { ticket });
});

const addTicketComment = asyncHandler(async (req, res) => {
  const ticket = await getScopedTicketOrThrow(req.user, req.params.ticketId);
  const comment = await Comment.create({
    ticketId: ticket._id,
    authorId: req.user._id,
    body: req.body.body,
    visibility: req.body.visibility,
  });

  ticket.history.push({
    action: 'comment_added',
    changedBy: req.user._id,
    note: req.body.body,
  });
  await ticket.save();

  return success(res, 'Comment added successfully', { comment }, 201);
});

const getTicketComments = asyncHandler(async (req, res) => {
  const ticket = await getScopedTicketOrThrow(req.user, req.params.ticketId);
  const comments = await Comment.find({ ticketId: ticket._id })
    .populate('authorId', 'name email role')
    .sort({ createdAt: 1 });

  return success(res, 'Comments fetched successfully', { comments });
});

const archiveTicket = asyncHandler(async (req, res) => {
  const ticket = await getScopedTicketOrThrow(req.user, req.params.ticketId);
  const before = ticket.toObject();
  ticket.isArchived = true;
  ticket.history.push({
    action: 'archived',
    changedBy: req.user._id,
    note: 'Ticket archived',
  });
  await ticket.save();

  await writeAuditLog({
    actorId: req.user._id,
    action: 'ticket_archived',
    entityType: 'ticket',
    entityId: ticket._id,
    before,
    after: ticket.toObject(),
  });

  return success(res, 'Ticket archived successfully');
});

const deleteTicket = asyncHandler(async (req, res) => {
  const ticket = await Ticket.findById(req.params.ticketId);
  if (!ticket) {
    throw new HttpError(404, 'Ticket was not found', 'TICKET_NOT_FOUND');
  }

  if (ticket.photos?.length) {
    await Promise.all(ticket.photos.map((photo) => deleteImage(photo.publicId)));
  }

  await Ticket.deleteOne({ _id: ticket._id });
  await Comment.deleteMany({ ticketId: ticket._id });
  await writeAuditLog({
    actorId: req.user._id,
    action: 'ticket_deleted',
    entityType: 'ticket',
    entityId: ticket._id,
    before: ticket.toObject(),
  });

  return success(res, 'Ticket deleted successfully');
});

module.exports = {
  addTicketComment,
  archiveTicket,
  assignTicket,
  changeTicketStatus,
  createTicket,
  deleteTicket,
  getTicketById,
  getTicketComments,
  getTicketPhotos,
  getTickets,
  uploadTicketPhoto,
  deleteTicketPhoto,
  updateTicket,
};
