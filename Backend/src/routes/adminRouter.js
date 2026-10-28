import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.js';
import * as grievanceController from '../controllers/grievanceController.js';

const adminRouter = Router();
adminRouter.use(authenticate, authorize('administrator'));
adminRouter.get('/grievances', grievanceController.listGrievances);
adminRouter.get('/grievances/:ticketId', grievanceController.getGrievance);
adminRouter.get('/grievances/:ticketId/attachments/:filename', grievanceController.downloadAttachment);
adminRouter.patch('/grievances/:ticketId/status', grievanceController.updateGrievanceStatus);
adminRouter.patch('/grievances/:ticketId/assign', grievanceController.assignGrievance);
adminRouter.get('/grievances/:ticketId/audit', grievanceController.verifyAuditLog);
adminRouter.get('/officials', grievanceController.getOfficials);
adminRouter.post('/officials', grievanceController.createOfficial);
adminRouter.get('/escalation-policy', grievanceController.getEscalationPolicy);
adminRouter.patch('/escalation-policy', grievanceController.updateEscalationPolicy);

export default adminRouter;
