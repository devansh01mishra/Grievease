import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.js';
import * as grievanceController from '../controllers/grievanceController.js';
import upload from '../middlewares/upload.js';

const studentRouter = Router();
studentRouter.use(authenticate, authorize('student'));
studentRouter.get('/grievances', grievanceController.listGrievances);
studentRouter.post('/grievances', upload.array('attachments', 5), grievanceController.createGrievance);
studentRouter.get('/grievances/:ticketId', grievanceController.getGrievance);
studentRouter.get('/grievances/:ticketId/attachments/:filename', grievanceController.downloadAttachment);

export default studentRouter;
