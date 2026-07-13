process.env.NODE_ENV = 'test';
process.env.TEST_AUTH_BYPASS = 'true';

jest.mock('../utils/cloudinary', () => ({
  uploadImage: jest.fn().mockResolvedValue({
    public_id: 'tickets/photo_test_abc123',
    secure_url: 'https://res.cloudinary.com/demo/image/upload/v1/tickets/photo_test_abc123.png',
    url: 'https://res.cloudinary.com/demo/image/upload/v1/tickets/photo_test_abc123.png',
  }),
  deleteImage: jest.fn().mockResolvedValue({ result: 'ok' }),
}));
const { uploadImage, deleteImage } = require('../utils/cloudinary');

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app');
const { connectDatabase, disconnectDatabase } = require('../config/database');
const { ensureDefaultStages } = require('../services/bootstrap.service');
const { AuditLog, Department, Stage, Ticket, User } = require('../models');

let mongoServer;

function auth(user) {
  return {
    'x-test-user': JSON.stringify({ _id: user._id, email: user.email, role: user.role }),
  };
}

async function resetDatabase() {
  await Promise.all(Object.values(mongoose.connection.collections).map((collection) => collection.deleteMany({})));
  await ensureDefaultStages();
}

async function seedBaseData() {
  const [inbox, inProgress, done] = await Promise.all([
    Stage.findOne({ key: 'inbox' }),
    Stage.findOne({ key: 'in_progress' }),
    Stage.findOne({ key: 'done' }),
  ]);

  const it = await Department.create({ name: 'IT', description: 'Information technology' });
  const hr = await Department.create({ name: 'HR', description: 'Human resources' });

  const owner = await User.create({
    name: 'Owner User',
    email: 'owner@test.com',
    role: 'owner',
  });
  const manager = await User.create({
    name: 'Manager User',
    email: 'manager@test.com',
    role: 'manager',
  });
  const supervisor = await User.create({
    name: 'Supervisor User',
    email: 'supervisor@test.com',
    role: 'supervisor',
    departmentId: it._id,
  });
  const employee = await User.create({
    name: 'Employee User',
    email: 'employee@test.com',
    role: 'employee',
    departmentId: it._id,
    supervisorId: supervisor._id,
  });
  const teammate = await User.create({
    name: 'Team Mate',
    email: 'teammate@test.com',
    role: 'employee',
    departmentId: it._id,
    supervisorId: supervisor._id,
  });
  const outsider = await User.create({
    name: 'Outsider User',
    email: 'outsider@test.com',
    role: 'employee',
    departmentId: hr._id,
  });

  const tickets = await Ticket.insertMany([
    {
      ticketNumber: 1001,
      title: 'Own ticket',
      description: 'Assigned directly to employee',
      creatorId: manager._id,
      assignedUserId: employee._id,
      assignedDepartmentId: it._id,
      statusId: inbox._id,
      priority: 'medium',
    },
    {
      ticketNumber: 1002,
      title: 'Department ticket',
      description: 'Assigned to IT department',
      creatorId: manager._id,
      assignedDepartmentId: it._id,
      statusId: inProgress._id,
      priority: 'high',
    },
    {
      ticketNumber: 1003,
      title: 'Team ticket',
      description: 'Assigned to a team member',
      creatorId: manager._id,
      assignedUserId: teammate._id,
      statusId: inbox._id,
      priority: 'low',
    },
    {
      ticketNumber: 1004,
      title: 'Other department ticket',
      description: 'Assigned to HR',
      creatorId: manager._id,
      assignedUserId: outsider._id,
      assignedDepartmentId: hr._id,
      statusId: done._id,
      priority: 'urgent',
    },
  ]);

  return {
    departments: { it, hr },
    stages: { inbox, inProgress, done },
    users: { owner, manager, supervisor, employee, teammate, outsider },
    tickets,
  };
}

beforeAll(async () => {
  jest.setTimeout(120000);
  mongoServer = await MongoMemoryServer.create({
    binary: {
      version: '7.0.14',
    },
  });
  process.env.MONGO_URI = mongoServer.getUri();
  await connectDatabase(process.env.MONGO_URI);
});

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await disconnectDatabase();
  await mongoServer.stop();
});

describe('internal ticketing API', () => {
  test('health endpoint works', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('dev auth login returns a usable token', async () => {
    const res = await request(app).post('/api/auth/dev-login').send({
      email: 'dev@example.com',
      password: 'secret123',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toContain('dev-token:');

    const meRes = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${res.body.data.token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user.email).toBe('dev@example.com');
  });

  test('standard login returns a usable token', async () => {
    await User.create({
      name: 'Regular User',
      email: 'login@example.com',
      role: 'employee',
    });

    const res = await request(app).post('/api/auth/login').send({
      email: 'login@example.com',
      password: 'secret123',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();

    const meRes = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${res.body.data.token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user.email).toBe('login@example.com');
  });

  test('sync profile links an existing account when email casing differs', async () => {
    const existingUser = await User.create({
      name: 'Existing User',
      email: 'john@example.com',
      role: 'employee',
    });

    const res = await request(app)
      .post('/api/auth/sync')
      .set('x-test-user', JSON.stringify({ _id: existingUser._id, email: 'john@example.com' }))
      .send({
        name: 'John Doe',
        email: 'John@Example.com',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.user._id).toBe(existingUser._id.toString());
    expect(res.body.data.user.email).toBe('john@example.com');

    const reloadedUser = await User.findById(existingUser._id);
    expect(reloadedUser.name).toBe('John Doe');
    expect(reloadedUser.email).toBe('john@example.com');
  });

  test('sync profile recovers from duplicate-key errors during signup', async () => {
    const existingUser = await User.create({
      name: 'Existing User',
      email: 'duplicate@example.com',
      role: 'employee',
    });

    const findOneSpy = jest.spyOn(User, 'findOne').mockResolvedValueOnce(null).mockResolvedValueOnce(existingUser);
    const createSpy = jest.spyOn(User, 'create').mockRejectedValueOnce(Object.assign(new Error('duplicate email'), {
      code: 11000,
      keyValue: { email: 'duplicate@example.com' },
    }));

    try {
      const res = await request(app)
        .post('/api/auth/sync')
        .set('x-test-user', JSON.stringify({ _id: existingUser._id, email: 'duplicate@example.com' }))
        .send({
          name: 'Duplicate User',
          email: 'duplicate@example.com',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.user._id).toBe(existingUser._id.toString());
    } finally {
      findOneSpy.mockRestore();
      createSpy.mockRestore();
    }
  });

  test('employee sees only directly assigned and department tickets', async () => {
    const { users } = await seedBaseData();

    const res = await request(app).get('/api/tickets').set(auth(users.employee));

    expect(res.status).toBe(200);
    expect(res.body.data.items.map((ticket) => ticket.title).sort()).toEqual(['Department ticket', 'Own ticket']);
  });

  test('supervisor sees employee scope plus team tickets and team dashboard', async () => {
    const { users } = await seedBaseData();

    const ticketsRes = await request(app).get('/api/tickets').set(auth(users.supervisor));
    const dashboardRes = await request(app).get('/api/dashboard/team').set(auth(users.supervisor));

    expect(ticketsRes.status).toBe(200);
    expect(ticketsRes.body.data.items.map((ticket) => ticket.title).sort()).toEqual([
      'Department ticket',
      'Own ticket',
      'Team ticket',
    ]);
    expect(dashboardRes.status).toBe(200);
    expect(dashboardRes.body.data.employees).toHaveLength(2);
  });

  test('manager sees all tickets and supervisor performance', async () => {
    const { users } = await seedBaseData();

    const ticketsRes = await request(app).get('/api/tickets').set(auth(users.manager));
    const supervisorsRes = await request(app).get('/api/dashboard/supervisors').set(auth(users.manager));

    expect(ticketsRes.status).toBe(200);
    expect(ticketsRes.body.data.items).toHaveLength(4);
    expect(supervisorsRes.status).toBe(200);
    expect(supervisorsRes.body.data.supervisors).toHaveLength(1);
  });

  test('owner manages stages and roles and can read audit logs', async () => {
    const { users } = await seedBaseData();

    const stageRes = await request(app)
      .post('/api/stages')
      .set(auth(users.owner))
      .send({
        name: 'Waiting For Approval',
        key: 'waiting_for_approval',
        order: 5,
        color: '#f59e0b',
      });

    const roleRes = await request(app)
      .patch(`/api/users/${users.employee._id}/role`)
      .set(auth(users.owner))
      .send({ role: 'supervisor' });

    const auditRes = await request(app).get('/api/audit-logs').set(auth(users.owner));

    expect(stageRes.status).toBe(201);
    expect(roleRes.status).toBe(200);
    expect(roleRes.body.data.user.role).toBe('supervisor');
    expect(auditRes.status).toBe(200);
    expect(auditRes.body.data.items.length).toBeGreaterThanOrEqual(2);
  });

  test('owner can delete a user account', async () => {
    const { users } = await seedBaseData();

    const deleteRes = await request(app).delete(`/api/users/${users.employee._id}`).set(auth(users.owner));

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.message).toBe('User deleted successfully');

    const deletedUser = await User.findById(users.employee._id);
    expect(deletedUser).toBeNull();
  });

  test('owner can create stages that are only visible to selected roles', async () => {
    const { users } = await seedBaseData();

    const createRes = await request(app)
      .post('/api/stages')
      .set(auth(users.owner))
      .send({
        name: 'In Review',
        key: 'in_review',
        order: 5,
        visibleToRoles: ['employee', 'manager'],
      });

    expect(createRes.status).toBe(201);

    const employeeRes = await request(app).get('/api/stages').set(auth(users.employee));
    const supervisorRes = await request(app).get('/api/stages').set(auth(users.supervisor));

    expect(employeeRes.status).toBe(200);
    expect(employeeRes.body.data.stages.some((stage) => stage.key === 'in_review')).toBe(true);
    expect(supervisorRes.status).toBe(200);
    expect(supervisorRes.body.data.stages.some((stage) => stage.key === 'in_review')).toBe(false);
  });

  test('owner can reorder stages', async () => {
    const { users } = await seedBaseData();

    const firstStage = await Stage.create({ name: 'Review', key: 'review', order: 1 });
    const secondStage = await Stage.create({ name: 'Approved', key: 'approved', order: 2 });

    const reorderRes = await request(app).patch('/api/stages/reorder').set(auth(users.owner)).send({
      stages: [
        { stageId: secondStage._id, order: 1 },
        { stageId: firstStage._id, order: 2 },
      ],
    });

    expect(reorderRes.status).toBe(200);

    const updatedFirst = await Stage.findById(firstStage._id);
    const updatedSecond = await Stage.findById(secondStage._id);
    expect(updatedFirst.order).toBe(2);
    expect(updatedSecond.order).toBe(1);
  });

  test('user search can find a user by object id', async () => {
    const { users } = await seedBaseData();

    const res = await request(app)
      .get('/api/users')
      .set(auth(users.owner))
      .query({ search: users.employee._id.toString(), page: 1, limit: 20 });

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0]._id).toBe(users.employee._id.toString());
  });

  test('employee is forbidden from owner-only actions', async () => {
    const { users } = await seedBaseData();

    const stageRes = await request(app)
      .post('/api/stages')
      .set(auth(users.employee))
      .send({
        name: 'Blocked',
        key: 'blocked',
        order: 5,
      });

    const usersRes = await request(app).get('/api/users').set(auth(users.employee));

    expect(stageRes.status).toBe(403);
    expect(usersRes.status).toBe(403);
  });

  test('manager can create, assign, comment, archive, and report tickets', async () => {
    const { departments, stages, users } = await seedBaseData();

    const createRes = await request(app)
      .post('/api/tickets')
      .set(auth(users.manager))
      .send({
        title: 'New hardware request',
        description: 'Need a new monitor',
        assignedDepartmentId: departments.it._id,
        priority: 'high',
      });

    const ticketId = createRes.body.data.ticket._id;

    const assignRes = await request(app)
      .patch(`/api/tickets/${ticketId}/assign`)
      .set(auth(users.manager))
      .send({
        assignedUserId: users.employee._id,
        assignedDepartmentId: departments.it._id,
      });

    const statusRes = await request(app)
      .patch(`/api/tickets/${ticketId}/status`)
      .set(auth(users.employee))
      .send({
        statusId: stages.inProgress._id,
        note: 'Started',
      });

    const commentRes = await request(app)
      .post(`/api/tickets/${ticketId}/comments`)
      .set(auth(users.employee))
      .send({
        body: 'Working on it',
        visibility: 'public',
      });

    const archiveRes = await request(app).patch(`/api/tickets/${ticketId}/archive`).set(auth(users.manager));
    const reportRes = await request(app)
      .get('/api/reports/tickets')
      .query({
        fromDate: '2026-01-01',
        toDate: '2026-12-31',
      })
      .set(auth(users.manager));

    expect(createRes.status).toBe(201);
    expect(assignRes.status).toBe(200);
    expect(statusRes.status).toBe(200);
    expect(commentRes.status).toBe(201);
    expect(archiveRes.status).toBe(200);
    expect(reportRes.status).toBe(200);
  });

  test('manager can upload and delete ticket photos', async () => {
    uploadImage.mockClear();
    deleteImage.mockClear();

    const { departments, users } = await seedBaseData();

    const createRes = await request(app)
      .post('/api/tickets')
      .set(auth(users.manager))
      .send({
        title: 'Photo ticket',
        description: 'Ticket with image',
        assignedDepartmentId: departments.it._id,
        priority: 'high',
      });

    expect(createRes.status).toBe(201);
    const ticketId = createRes.body.data.ticket._id;

    const uploadRes = await request(app)
      .post(`/api/tickets/${ticketId}/photos`)
      .set(auth(users.manager))
      .attach('photo', Buffer.from('fake-image'), {
        filename: 'screenshot.png',
        contentType: 'image/png',
      })
      .field('caption', 'Ticket screenshot');

    expect(uploadRes.status).toBe(201);
    expect(uploadImage).toHaveBeenCalled();
    expect(uploadRes.body.data.photo.url).toContain('https://res.cloudinary.com');
    expect(uploadRes.body.data.photo.publicId).toBe('tickets/photo_test_abc123');
    expect(uploadRes.body.data.photo._id).toBeDefined();

    const photoId = uploadRes.body.data.photo._id;

    const photosRes = await request(app).get(`/api/tickets/${ticketId}/photos`).set(auth(users.manager));
    expect(photosRes.status).toBe(200);
    expect(photosRes.body.data.photos).toHaveLength(1);

    const deleteRes = await request(app)
      .delete(`/api/tickets/${ticketId}/photos/${photoId}`)
      .set(auth(users.manager));

    expect(deleteRes.status).toBe(200);
    expect(deleteImage).toHaveBeenCalledWith('tickets/photo_test_abc123');
  });

  test('sync creates an employee profile from verified identity context', async () => {
    const department = await Department.create({ name: 'Finance' });
    const fakeAuthUser = {
      _id: new mongoose.Types.ObjectId(),
      email: 'new@test.com',
    };

    const res = await request(app)
      .post('/api/auth/sync')
      .set('x-test-user', JSON.stringify(fakeAuthUser))
      .send({
        name: 'New Auth User',
        email: 'new@test.com',
        departmentId: department._id,
      });

    const user = await User.findOne({ email: 'new@test.com' });

    expect(res.status).toBe(201);
    expect(user.role).toBe('employee');
  });
});
