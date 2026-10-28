import test from 'node:test';
import assert from 'node:assert/strict';
import { canTransitionGrievance, grievanceStatuses } from '../src/utils/grievanceWorkflow.js';

test('grievance statuses cover the persisted workflow', () => {
  assert.deepEqual(grievanceStatuses, [
    'Submitted',
    'Under Review',
    'In Progress',
    'Resolved',
    'Rejected',
    'Escalated'
  ]);
});

test('only permitted grievance status transitions are accepted', () => {
  assert.equal(canTransitionGrievance('Submitted', 'Under Review'), true);
  assert.equal(canTransitionGrievance('Submitted', 'Resolved'), false);
  assert.equal(canTransitionGrievance('Under Review', 'In Progress'), true);
  assert.equal(canTransitionGrievance('In Progress', 'Resolved'), true);
  assert.equal(canTransitionGrievance('Escalated', 'In Progress'), true);
  assert.equal(canTransitionGrievance('Resolved', 'In Progress'), false);
  assert.equal(canTransitionGrievance('Rejected', 'Under Review'), false);
  assert.equal(canTransitionGrievance('Unknown', 'Submitted'), false);
});
