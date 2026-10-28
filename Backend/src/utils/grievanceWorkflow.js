export const grievanceStatuses = [
  'Submitted',
  'Under Review',
  'In Progress',
  'Resolved',
  'Rejected',
  'Escalated'
];

const permittedTransitions = {
  Submitted: ['Under Review', 'Rejected'],
  'Under Review': ['In Progress', 'Rejected'],
  'In Progress': ['Resolved', 'Rejected'],
  Escalated: ['Under Review', 'In Progress', 'Resolved', 'Rejected'],
  Resolved: [],
  Rejected: []
};

export function canTransitionGrievance(from, to) {
  return permittedTransitions[from]?.includes(to) ?? false;
}
