import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Express, NextFunction, Request, Response } from 'express';
import logger from 'morgan';
import path from 'path';

import { AppDataSource } from './data-source';
import indexRouter from './routes/routes';
import adminRoutes from './routes/admin/routes';
import userRouter from './routes/user/routes';
import { articleRouter } from './routes/article/routes';
import mongoose from 'mongoose';

// const mongooseConnection = 'mongodb+srv://' + process.env.MONGODB_USER + ':' + process.env.MONGODB_PASS + '@' + process.env.MONGODB_URL;
const mongooseConnection = 'mongodb://' + process.env.MONGODB_USER + ':' + process.env.MONGODB_PASS + '@' + process.env.MONGODB_URL;

mongoose
  .connect(mongooseConnection)
  .then(() => {
    console.log('Connected to ' + mongooseConnection);
  })
  .catch((error) => {
    console.log("Couldn't connect to " + mongooseConnection);
    console.log(error.message);
  });

const app: Express = express();

AppDataSource.initialize().then(async () => {
  console.log('Data source was initialized');

  app.use(logger('dev'));
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());
  app.use(express.static(path.join(__dirname, 'public')));

  // use cors
  app.use(cors({ origin: '*' }));

  app.use('/', indexRouter);
  app.use('/admin', adminRoutes);
  app.use('/user', userRouter);
  app.use('/article', articleRouter);

  // catch 404 and forward to error handler
  app.use(function (req: Request, res: Response, next: NextFunction) {
    res.status(404).send('Not found');
    // next(createError(404));
  });

  // error handler
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.json({
      message: err.message,
      error: err,
    });
  });
});

export default app;
