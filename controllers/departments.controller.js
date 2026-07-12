const { Department, User, Ticket } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');
const HttpError = require('../utils/httpError');
const { writeAuditLog } = require('../utils/audit');

const createDepartment = asyncHandler(async (req, res) => {
  const department = await Department.create(req.body);
  await writeAuditLog({
    actorId: req.user._id,
    action: 'department_created',
    entityType: 'department',
    entityId: department._id,
    after: department.toObject(),
  });
  return success(res, 'Department created successfully', { department }, 201);
});

const getDepartments = asyncHandler(async (req, res) => {
  const departments = await Department.find().populate('managerId', 'name email role').sort({ name: 1 });
  return success(res, 'Departments fetched successfully', { departments });
});

const updateDepartment = asyncHandler(async (req, res) => {
  const department = await Department.findById(req.params.departmentId);
  if (!department) {
    throw new HttpError(404, 'Department was not found', 'DEPARTMENT_NOT_FOUND');
  }
  const before = department.toObject();
  Object.assign(department, req.body);
  await department.save();
  await writeAuditLog({
    actorId: req.user._id,
    action: 'department_updated',
    entityType: 'department',
    entityId: department._id,
    before,
    after: department.toObject(),
  });
  return success(res, 'Department updated successfully', { department });
});

const deleteDepartment = asyncHandler(async (req, res) => {
  const department = await Department.findById(req.params.departmentId);
  if (!department) {
    throw new HttpError(404, 'Department was not found', 'DEPARTMENT_NOT_FOUND');
  }

  const before = department.toObject();

  await User.updateMany({ departmentId: department._id }, { $set: { departmentId: null } });
  await Ticket.updateMany({ assignedDepartmentId: department._id }, { $set: { assignedDepartmentId: null } });

  await Department.deleteOne({ _id: department._id });

  await writeAuditLog({
    actorId: req.user._id,
    action: 'department_deleted',
    entityType: 'department',
    entityId: department._id,
    before,
  });

  return success(res, 'Department deleted successfully');
});

module.exports = {
  createDepartment,
  getDepartments,
  updateDepartment,
  deleteDepartment,
};
