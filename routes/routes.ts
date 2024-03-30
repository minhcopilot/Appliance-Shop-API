import express, { Express } from 'express';
const router = express.Router();
const passport = require('passport');
//const { passportVerifyToken, passportVerifyAccount } = require('../../middlewares/passport');
import { passportVerifyAccount, passportVerifyToken } from '../middlewares/passport';
import categoriesRouter from './categories';
import customersRouter from './customers';
import employeesRouter from './employees';
import ordersRouter from './orders';
import productsRouter from './products';
import suppliersRouter from './suppliers';

passport.use('jwt', passportVerifyToken);
passport.use('local', passportVerifyAccount);

router.use('/categories', categoriesRouter);
router.use('/products', productsRouter);
router.use('/suppliers', suppliersRouter);
router.use('/orders', ordersRouter);
router.use('/customers', passport.authenticate('jwt', { session: false }), customersRouter);
router.use('/employees', employeesRouter);

export default router;
