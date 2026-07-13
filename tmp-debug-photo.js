const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('./app');
const { connectDatabase, disconnectDatabase } = require('./config/database');
const { ensureDefaultStages } = require('./services/bootstrap.service');
const { Department, Stage, Ticket, User } = require('./models');

(async () => {
  const mongoServer = await MongoMemoryServer.create({ binary: { version: '7.0.14' } });
  process.env.MONGO_URI = mongoServer.getUri();
  await connectDatabase(process.env.MONGO_URI);
  await ensureDefaultStages();

  const auth = (user) => ({ 'x-test-user': JSON.stringify({ _id: user._id, email: user.email, role: user.role }) });
  const [inbox] = await Promise.all([Stage.findOne({ key: 'inbox' })]);
  const it = await Department.create({ name: 'IT', description: 'Information technology' });
  const manager = await User.create({ name: 'Manager User', email: 'manager@test.com', role: 'manager' });
  const { _id: itId } = it;

  const createRes = await request(app)
    .post('/api/tickets')
    .set(auth(manager))
    .send({
      title: 'Photo ticket',
      description: 'Ticket with image',
      assignedDepartmentId: itId,
      priority: 'high',
    });
  console.log('create status', createRes.status, createRes.body);
  const ticketId = createRes.body.data.ticket._id;

  const uploadRes = await request(app)
    .post(`/api/tickets/${ticketId}/photos`)
    .set(auth(manager))
    .attach('photo', Buffer.from('fake-image'), {
      filename: 'screenshot.png',
      contentType: 'image/png',
    })
    .field('caption', 'Ticket screenshot');
  console.log('upload status', uploadRes.status, uploadRes.body);
  const photoId = uploadRes.body.data?.photo?._id;
  console.log('photoId', photoId);

  const deleteRes = await request(app)
    .delete(`/api/tickets/${ticketId}/photos/${photoId}`)
    .set(auth(manager));
  console.log('delete status', deleteRes.status, deleteRes.body);

  await disconnectDatabase();
  await mongoServer.stop();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
