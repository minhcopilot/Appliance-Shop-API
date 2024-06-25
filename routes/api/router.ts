import express from 'express';
import redployRouter from './redeploy';

export const apiRouter = express.Router();
apiRouter.use('/redeploy', redployRouter);
