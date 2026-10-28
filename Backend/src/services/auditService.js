import { createHash } from 'node:crypto';
import AuditLog from '../models/auditLog.js';

const locks = new Map();

function normalize(value) {
  if (value instanceof Date) return value.toISOString();
  if (value === null || typeof value !== 'object') return value;
  if (value._bsontype === 'ObjectId') return value.toString();
  if (Array.isArray(value)) return value.map(normalize);
  if (typeof value.toObject === 'function') return normalize(value.toObject());
  return Object.fromEntries(
    Object.keys(value).sort()
      .filter((key) => value[key] !== undefined)
      .map((key) => [key, normalize(value[key])])
  );
}

function calculateHash(entry) {
  const canonicalEntry = {
    grievanceId: entry.grievanceId.toString(),
    sequence: entry.sequence,
    action: entry.action,
    performedBy: entry.performedBy?.toString() ?? 'SYSTEM',
    actorLabel: entry.actorLabel ?? 'user',
    previousState: normalize(entry.previousState ?? null),
    currentState: normalize(entry.currentState ?? null),
    timestamp: new Date(entry.timestamp).toISOString(),
    previousHash: entry.previousHash
  };
  return createHash('sha256').update(JSON.stringify(canonicalEntry)).digest('hex');
}

async function withGrievanceLock(grievanceId, operation) {
  const key = grievanceId.toString();
  const previous = locks.get(key) ?? Promise.resolve();
  let release;
  const current = new Promise((resolve) => { release = resolve; });
  locks.set(key, current);
  await previous;
  try {
    return await operation();
  } finally {
    release();
    if (locks.get(key) === current) locks.delete(key);
  }
}

export async function logAuditTrail(grievanceId, action, performedBy, previousState, currentState, actorLabel = 'user') {
  return withGrievanceLock(grievanceId, async () => {
    const lastEntry = await AuditLog.findOne({ grievanceId }).sort({ sequence: -1 });
    const entry = {
      grievanceId,
      sequence: (lastEntry?.sequence ?? 0) + 1,
      action,
      performedBy: performedBy ?? null,
      actorLabel,
      previousState: normalize(previousState ?? null),
      currentState: normalize(currentState ?? null),
      timestamp: new Date(),
      previousHash: lastEntry?.hash ?? 'GENESIS_HASH'
    };
    entry.hash = calculateHash(entry);
    return AuditLog.create(entry);
  });
}

export async function verifyChain(grievanceId) {
  const entries = await AuditLog.find({ grievanceId }).sort({ sequence: 1 }).lean();
  let previousHash = 'GENESIS_HASH';
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    if (entry.sequence !== index + 1 || entry.previousHash !== previousHash) return false;
    if (entry.hash !== calculateHash(entry)) return false;
    previousHash = entry.hash;
  }
  return entries.length > 0;
}

export async function getAuditTrail(grievanceId) {
  return AuditLog.find({ grievanceId })
    .sort({ sequence: 1 })
    .populate('performedBy', 'name email role')
    .lean();
}

export default { logAuditTrail, verifyChain, getAuditTrail };
