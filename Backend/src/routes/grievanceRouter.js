import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.js';
import * as grievanceController from '../controllers/grievanceController.js';
import upload from '../middlewares/upload.js';

const grievanceRouter = Router();

grievanceRouter.use(authenticate);
grievanceRouter.get('/', grievanceController.listGrievances);
grievanceRouter.get('/:ticketId', grievanceController.getGrievance);
grievanceRouter.get(
  '/:ticketId/attachments/:filename',
  grievanceController.downloadAttachment
);
grievanceRouter.post(
  '/',
  authorize('student'),
  upload.array('attachments', 5),
  grievanceController.createGrievance
);
grievanceRouter.patch(
  '/:ticketId/status',
  authorize('official', 'administrator'),
  grievanceController.updateGrievanceStatus
);
grievanceRouter.patch(
  '/:ticketId/assign',
  authorize('administrator'),
  grievanceController.assignGrievance
);
grievanceRouter.get(
  '/:ticketId/audit',
  authorize('administrator'),
  grievanceController.verifyAuditLog
);

export default grievanceRouter;
