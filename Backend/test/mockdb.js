import AuditLog from '../src/models/auditLog.js';
import EscalationPolicy from '../src/models/escalationPolicy.js';
import Grievance from '../src/models/grievance.js';
import User from '../src/models/user.js';

const models = [AuditLog, EscalationPolicy, Grievance, User];

function referenceId(value) {
  if (value && typeof value === 'object' && '_id' in value) return value._id;
  return value;
}

class MockObjectId {
  constructor(value) { this.value = String(value); }
  toString() { return this.value; }
  equals(other) { return this.value === String(referenceId(other)); }
}

function sameValue(left, right) {
  const leftId = referenceId(left);
  const rightId = referenceId(right);
  if (leftId == null || rightId == null) return leftId === rightId;
  return String(leftId) === String(rightId);
}

function matches(record, filter) {
  return Object.entries(filter).every(([key, expected]) => {
    const actual = record[key];
    if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
      if ('$nin' in expected) return !expected.$nin.some((value) => sameValue(actual, value));
      if ('$lte' in expected) return actual <= expected.$lte;
    }
    return sameValue(actual, expected);
  });
}

function applyUpdate(record, update) {
  Object.assign(record, update.$set || {});
  for (const [key, amount] of Object.entries(update.$inc || {})) {
    record[key] = (record[key] || 0) + amount;
  }
}

class MockDocument {
  constructor(database, collection, record) {
    Object.defineProperty(this, '_database', { value: database });
    Object.defineProperty(this, '_collection', { value: collection });
    Object.defineProperty(this, '_record', { value: record });
    Object.assign(this, record, { id: String(record._id) });
  }

  toString() {
    return String(this._id);
  }

  toObject() {
    const result = {};
    for (const [key, value] of Object.entries(this)) {
      if (key !== 'id' && !key.startsWith('_')) result[key] = value;
    }
    result._id = this._id;
    result.id = this.id;
    return result;
  }

  async populate(fields) {
    const paths = Array.isArray(fields) ? fields : String(fields).split(/\s+/);
    for (const field of paths) {
      if ((field === 'student' || field === 'assignedTo' || field === 'performedBy') && this[field]) {
        const user = this._database.users.find((entry) => sameValue(entry._id, this[field]));
        if (user) this[field] = this._database.document('User', user);
      }
    }
    return this;
  }

  async save() {
    for (const key of Object.keys(this._record)) {
      if (key !== '_id' && key in this) this._record[key] = referenceId(this[key]);
    }
    return this;
  }
}

class MockQuery {
  constructor(resolve) {
    this.resolve = resolve;
    this.sortOrder = null;
    this.offset = 0;
    this.maximum = Infinity;
    this.populatePaths = [];
    this.asLean = false;
    this.singleResult = false;
    this.selectedFields = null;
  }

  sort(order) { this.sortOrder = order; return this; }
  skip(offset) { this.offset = offset; return this; }
  limit(maximum) { this.maximum = maximum; return this; }
  populate(paths) { this.populatePaths.push(paths); return this; }
  select(fields) { this.selectedFields = fields; return this; }
  lean() { this.asLean = true; return this; }
  first() { this.singleResult = true; return this; }

  async execute() {
    let result = await this.resolve();
    const isArray = Array.isArray(result);
    let documents = isArray ? result : result ? [result] : [];

    if (this.sortOrder) {
      const [[field, direction]] = Object.entries(this.sortOrder);
      documents = documents.slice().sort((left, right) => {
        const a = left[field];
        const b = right[field];
        if (a === b) return 0;
        return (a < b ? -1 : 1) * direction;
      });
    }
    if (isArray) documents = documents.slice(this.offset, this.offset + this.maximum);

    for (const paths of this.populatePaths) {
      await Promise.all(documents.map((document) => document.populate(paths)));
    }
    if (this.asLean) {
      documents = documents.map((document) => typeof document.toObject === 'function'
        ? document.toObject()
        : { ...document });
      if (this.selectedFields) {
        const fields = this.selectedFields.split(/\s+/).filter(Boolean);
        const included = fields.filter((field) => !field.startsWith('-'));
        const excluded = fields.filter((field) => field.startsWith('-')).map((field) => field.slice(1));
        documents = documents.map((document) => {
          if (included.length) {
            const projection = { _id: document._id };
            for (const field of included) if (field in document) projection[field] = document[field];
            return projection;
          }
          const projection = { ...document };
          for (const field of excluded) delete projection[field];
          return projection;
        });
      }
    }
    if (this.singleResult) return documents[0] || null;
    return isArray ? documents : documents[0] || null;
  }

  then(resolve, reject) { return this.execute().then(resolve, reject); }
  catch(reject) { return this.execute().catch(reject); }
}

export default class MockDatabase {
  constructor() {
    this.users = [];
    this.grievances = [];
    this.auditLogs = [];
    this.policies = [];
    this.nextId = 1;
    this.originalMethods = new Map();
  }

  id() {
    return `mock-${this.nextId++}`;
  }

  document(modelName, record) {
    return new MockDocument(this, modelName, record);
  }

  install(model, methods) {
    const original = new Map();
    for (const [name, implementation] of Object.entries(methods)) {
      original.set(name, model[name]);
      model[name] = implementation;
    }
    this.originalMethods.set(model, original);
  }

  connect() {
    const db = this;
    const userMethods = {
      exists: async (filter) => db.users.some((record) => matches(record, filter)),
      create: async (input) => {
        const record = {
          ...input,
          _id: new MockObjectId(db.id()),
          active: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        db.users.push(record);
        return db.document('User', record);
      },
      findOne: (filter) => new MockQuery(() => {
        const record = db.users.find((entry) => matches(entry, filter));
        return record ? db.document('User', record) : null;
      }),
      findById: (id) => new MockQuery(() => {
        const record = db.users.find((entry) => sameValue(entry._id, id));
        return record ? db.document('User', record) : null;
      }),
      find: (filter) => new MockQuery(() => db.users
        .filter((record) => matches(record, filter))
        .map((record) => db.document('User', record)))
    };

    const grievanceMethods = {
      create: async (input) => {
        const record = {
          ...input,
          _id: new MockObjectId(db.id()),
          student: new MockObjectId(input.student),
          status: 'Submitted',
          assignedTo: null,
          isPastDue: false,
          escalationLevel: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        db.grievances.push(record);
        return db.document('Grievance', record);
      },
      find: (filter) => new MockQuery(() => db.grievances
        .filter((record) => matches(record, filter))
        .map((record) => db.document('Grievance', record))),
      findOne: (filter) => new MockQuery(() => {
        const record = db.grievances.find((entry) => matches(entry, filter));
        return record ? db.document('Grievance', record) : null;
      }),
      findOneAndUpdate: (filter, update) => new MockQuery(() => {
        const record = db.grievances.find((entry) => matches(entry, filter));
        if (!record) return null;
        applyUpdate(record, update);
        return db.document('Grievance', record);
      }),
      updateOne: async (filter, update) => {
        const record = db.grievances.find((entry) => matches(entry, filter));
        if (record) applyUpdate(record, update);
        return { matchedCount: record ? 1 : 0 };
      },
      deleteOne: async (filter) => {
        const index = db.grievances.findIndex((entry) => matches(entry, filter));
        if (index >= 0) db.grievances.splice(index, 1);
        return { deletedCount: index >= 0 ? 1 : 0 };
      }
    };

    const policyMethods = {
      findOneAndUpdate: (filter, update) => new MockQuery(() => {
        let record = db.policies.find((entry) => matches(entry, filter));
        if (!record && update.$setOnInsert) {
          record = {
            ...update.$setOnInsert,
            _id: db.id(),
            deadlineHours: 48,
            escalateAfterHours: 24,
            enabled: true
          };
          db.policies.push(record);
        }
        if (record) applyUpdate(record, update);
        return record ? db.document('EscalationPolicy', record) : null;
      })
    };

    const auditMethods = {
      create: async (input) => {
        const record = { ...input, _id: db.id() };
        db.auditLogs.push(record);
        return db.document('AuditLog', record);
      },
      findOne: (filter) => new MockQuery(() => {
        const record = db.auditLogs.filter((entry) => matches(entry, filter));
        return record.map((entry) => db.document('AuditLog', entry));
      }).first(),
      find: (filter) => new MockQuery(() => db.auditLogs
        .filter((record) => matches(record, filter))
        .map((record) => db.document('AuditLog', record)))
    };

    this.install(User, userMethods);
    this.install(Grievance, grievanceMethods);
    this.install(EscalationPolicy, policyMethods);
    this.install(AuditLog, auditMethods);
    return this;
  }

  seedUser(input) {
    const record = { ...input, _id: input._id || new MockObjectId(this.id()), active: input.active ?? true };
    this.users.push(record);
    return this.document('User', record);
  }

  disconnect() {
    for (const [model, methods] of this.originalMethods) {
      for (const [name, implementation] of methods) model[name] = implementation;
    }
    this.originalMethods.clear();
  }
}
