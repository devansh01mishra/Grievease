import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { startMockServer } from './mockServer.js';

let mockServer;
let apiUrl;

before(async () => {
  mockServer = await startMockServer({ port: 0 });
  apiUrl = `http://127.0.0.1:${mockServer.address.port}`;
});

after(async () => {
  await mockServer?.close();
});

test('HTTP API supports frontend authentication and grievance requests without MongoDB', async () => {
  const origin = 'http://localhost:5173';
  const healthResponse = await fetch(`${apiUrl}/health`);
  assert.equal(healthResponse.status, 200);
  assert.deepEqual(await healthResponse.json(), { status: 'ok' });

  const preflight = await fetch(`${apiUrl}/api/auth/login`, {
    method: 'OPTIONS',
    headers: {
      Origin: origin,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type'
    }
  });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), origin);

  const unauthorized = await fetch(`${apiUrl}/api/grievances`, { headers: { Origin: origin } });
  assert.equal(unauthorized.status, 401);

  const loginResponse = await fetch(`${apiUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify({ email: 'student@example.test', password: 'demo-password-123' })
  });
  assert.equal(loginResponse.status, 200);
  const { token, user } = await loginResponse.json();
  assert.equal(user.role, 'student');

  const meResponse = await fetch(`${apiUrl}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}`, Origin: origin }
  });
  assert.equal(meResponse.status, 200);
  assert.equal((await meResponse.json()).user.id, user.id);

  const createResponse = await fetch(`${apiUrl}/api/grievances`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify({
      title: 'Mock server integration test',
      category: 'Facilities',
      description: 'This case is held only in the mock database.',
      priority: 'Medium'
    })
  });
  assert.equal(createResponse.status, 201);
  const { grievance } = await createResponse.json();
  assert.match(grievance.ticketId, /^GRV-\d{4}-[A-F0-9]{8}$/);

  const listResponse = await fetch(`${apiUrl}/api/grievances?limit=10&page=1`, {
    headers: { Authorization: `Bearer ${token}`, Origin: origin }
  });
  assert.equal(listResponse.status, 200);
  const listed = await listResponse.json();
  assert.equal(listed.grievances.length, 1);
  assert.equal(listed.grievances[0].ticketId, grievance.ticketId);
});

test('administrator creates an official, assigns a grievance, and the official resolves it', async () => {
  const origin = 'http://localhost:5173';
  const request = async (path, { token, ...options } = {}) => {
    const headers = { Origin: origin, ...(options.headers || {}) };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (options.body && typeof options.body !== 'string') {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }
    return fetch(`${apiUrl}${path}`, { ...options, headers });
  };
  const login = async (email, password, expectedRole) => {
    const response = await request('/api/auth/login', {
      method: 'POST',
      body: { email, password }
    });
    assert.equal(response.status, 200);
    const session = await response.json();
    assert.equal(session.user.role, expectedRole);
    return session;
  };

  const student = await login('student@example.test', 'demo-password-123', 'student');
  const createCaseResponse = await request('/api/grievances', {
    token: student.token,
    method: 'POST',
    body: {
      title: 'Repair the library projector',
      category: 'Infrastructure',
      description: 'The projector in the main library is not working.',
      priority: 'High'
    }
  });
  assert.equal(createCaseResponse.status, 201);
  const { grievance } = await createCaseResponse.json();

  const administrator = await login('admin@example.test', 'admin-password-123', 'administrator');
  const createOfficialResponse = await request('/api/admin/officials', {
    token: administrator.token,
    method: 'POST',
    body: {
      name: 'Demo Facilities Official',
      email: 'official@example.test',
      password: 'official-password-123',
      department: 'Facilities'
    }
  });
  assert.equal(createOfficialResponse.status, 201);
  const { user: official } = await createOfficialResponse.json();
  assert.equal(official.role, 'official');

  const assignResponse = await request(`/api/admin/grievances/${encodeURIComponent(grievance.ticketId)}/assign`, {
    token: administrator.token,
    method: 'PATCH',
    body: { officialId: official.id }
  });
  assert.equal(assignResponse.status, 200);
  assert.equal((await assignResponse.json()).grievance.assignedTo.id, official.id);

  const officialSession = await login('official@example.test', 'official-password-123', 'official');
  const officialCasesResponse = await request('/api/official/grievances', { token: officialSession.token });
  assert.equal(officialCasesResponse.status, 200);
  assert.deepEqual((await officialCasesResponse.json()).grievances.map((item) => item.ticketId), [grievance.ticketId]);

  for (const status of ['Under Review', 'In Progress', 'Resolved']) {
    const updateResponse = await request(`/api/official/grievances/${encodeURIComponent(grievance.ticketId)}/status`, {
      token: officialSession.token,
      method: 'PATCH',
      body: { status, note: `Demo workflow update: ${status}` }
    });
    assert.equal(updateResponse.status, 200);
    assert.equal((await updateResponse.json()).grievance.status, status);
  }

  const studentCaseResponse = await request(`/api/student/grievances/${encodeURIComponent(grievance.ticketId)}`, {
    token: student.token
  });
  assert.equal(studentCaseResponse.status, 200);
  assert.equal((await studentCaseResponse.json()).grievance.status, 'Resolved');
});
