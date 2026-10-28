import { pathToFileURL } from 'node:url';
import MockDatabase from './mockdb.js';

export async function startMockServer({ port = Number(process.env.PORT) } = {}) {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET ||= 'local-mock-server-secret-change-before-deployment';
  process.env.FRONTEND_ORIGIN ||= 'http://localhost:5173';
  process.env.ADMIN_BOOTSTRAP_KEY ||= 'local-mock-admin-bootstrap-key';

  const database = new MockDatabase().connect();
  try {
    const [{ default: app }, authService] = await Promise.all([
      import('../index.js'),
      import('../src/services/authService.js')
    ]);

    await Promise.all([
      authService.registerStudent({
        name: 'Demo Student',
        email: 'student@example.test',
        password: 'demo-password-123'
      }),
      authService.bootstrapAdministrator({
        key: process.env.ADMIN_BOOTSTRAP_KEY,
        name: 'Demo Administrator',
        email: 'admin@example.test',
        password: 'admin-password-123'
      })
    ]);

    const server = await new Promise((resolve, reject) => {
      const instance = app.listen(port || 3000, () => resolve(instance));
      instance.once('error', reject);
    });

    return {
      server,
      database,
      address: server.address(),
      async close() {
        await new Promise((resolve, reject) => {
          server.close((error) => error ? reject(error) : resolve());
        });
        database.disconnect();
      }
    };
  } catch (error) {
    database.disconnect();
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const mockServer = await startMockServer();
  console.log(`Grievease in-memory API listening on port ${mockServer.address.port}.`);
  console.log('Demo student: student@example.test / demo-password-123');
  console.log('Demo administrator: admin@example.test / admin-password-123');
}
