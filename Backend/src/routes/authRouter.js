import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import * as authController from '../controllers/authController.js';

const authRouter = Router();

authRouter.post('/register', authController.registerStudent);
authRouter.post('/login', authController.login);
authRouter.post('/bootstrap-admin', authController.bootstrapAdministrator);
authRouter.get('/me', authenticate, authController.currentUser);

export default authRouter;
