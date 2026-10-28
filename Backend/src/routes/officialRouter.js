import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.js';
import * as grievanceController from '../controllers/grievanceController.js';

const officialRouter = Router();
officialRouter.use(authenticate, authorize('official'));
officialRouter.get('/grievances', grievanceController.listGrievances);
officialRouter.get('/grievances/:ticketId', grievanceController.getGrievance);
officialRouter.get('/grievances/:ticketId/attachments/:filename', grievanceController.downloadAttachment);
officialRouter.patch('/grievances/:ticketId/status', grievanceController.updateGrievanceStatus);

export default officialRouter;
