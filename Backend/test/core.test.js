import assert from 'node:assert/strict';
import { after, afterEach, beforeEach, test } from 'node:test';
import MockDatabase from './mockdb.js';
import * as authService from '../src/services/authService.js';
import * as auditService from '../src/services/auditService.js';
import * as grievanceService from '../src/services/grievanceService.js';

const originalJwtSecret = process.env.JWT_SECRET;
process.env.JWT_SECRET = 'test-secret-with-at-least-thirty-two-characters';

let database;
beforeEach(() => {
  database = new MockDatabase().connect();
});

afterEach(() => {
  database.disconnect();
});

test('backend core flows work against an isolated mock database', async () => {
  const student = await authService.registerStudent({
    name: 'Student Example',
    email: 'STUDENT@example.edu',
    password: 'secure-password-123'
  });
  assert.equal(student.email, 'student@example.edu');
  assert.equal(student.role, 'student');
  assert.equal('password' in student, false);

  await assert.rejects(
    authService.registerStudent({
      name: 'Another Student',
      email: 'student@example.edu',
      password: 'secure-password-123'
    }),
    { status: 409 }
  );
  await assert.rejects(
    authService.registerStudent({ name: 'A', email: 'bad-email', password: 'short' }),
    { status: 400 }
  );

  const login = await authService.login({
    email: 'STUDENT@example.edu',
    password: 'secure-password-123'
  });
  assert.equal(typeof login.token, 'string');
  assert.equal(login.user.id, student.id);
  await assert.rejects(
    authService.login({ email: student.email, password: 'incorrect-password' }),
    { status: 401 }
  );

  const official = await authService.createOfficial({
    name: 'Official Example',
    email: 'official@example.edu',
    password: 'official-password-123',
    department: 'Facilities'
  });
  const administrator = database.seedUser({
    name: 'Administrator Example',
    email: 'admin@example.edu',
    password: 'unused',
    role: 'administrator'
  });

  const created = await grievanceService.createGrievance(
    student,
    {
      title: 'Water supply interruption',
      category: 'Hostel & Facilities',
      description: 'Water has been unavailable since yesterday.',
      priority: 'High'
    }
  );
  assert.match(created.ticketId, /^GRV-\d{4}-[A-F0-9]{8}$/);
  assert.equal(created.status, 'Submitted');
  assert.equal(String(created.student), student.id);
  assert.equal(database.auditLogs[0].action, 'CREATED');

  const studentCases = await grievanceService.listGrievances(student);
  assert.equal(studentCases.length, 1);
  assert.equal(studentCases[0].ticketId, created.ticketId);
  assert.equal((await grievanceService.listGrievances(official)).length, 0);
  await assert.rejects(
    grievanceService.listGrievances(student, { page: 0 }),
    { status: 400 }
  );
  await assert.rejects(
    grievanceService.getGrievance(official, created.ticketId),
    { status: 404 }
  );
  await assert.rejects(
    grievanceService.updateGrievanceStatus(student, created.ticketId, 'Under Review'),
    { status: 403 }
  );

  const assignment = await grievanceService.assignGrievance(
    administrator,
    created.ticketId,
    official.id
  );
  assert.equal(assignment.grievance.assignedTo.id, official.id);
  assert.equal((await grievanceService.listGrievances(official)).length, 1);

  const update = await grievanceService.updateGrievanceStatus(
    official,
    created.ticketId,
    'Under Review',
    'Inspection started.'
  );
  assert.equal(update.grievance.status, 'Under Review');
  assert.equal(update.studentId, student.id);
  await assert.rejects(
    grievanceService.updateGrievanceStatus(official, created.ticketId, 'Resolved'),
    { status: 409 }
  );

  const record = await grievanceService.findGrievanceByTicket(created.ticketId);
  assert.equal(await auditService.verifyChain(record._id), true);
  const entries = await auditService.getAuditTrail(record._id);
  assert.deepEqual(entries.map((entry) => entry.action), ['CREATED', 'ASSIGNED', 'STATUS_CHANGED']);

  const officials = await grievanceService.listOfficials();
  assert.equal(officials.length, 1);
  assert.equal(officials[0].name, official.name);
  assert.equal(officials[0].email, official.email);
  assert.equal('password' in officials[0], false);
});

after(() => {
  if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originalJwtSecret;
});
