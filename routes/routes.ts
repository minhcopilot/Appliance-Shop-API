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
import vouchersRouter from './vouchers';

passport.use('jwt', passportVerifyToken);
passport.use('local', passportVerifyAccount);

router.use('/categories', categoriesRouter);
router.use('/products', productsRouter);
router.use('/suppliers', suppliersRouter);
router.use('/orders', ordersRouter);
// router.use('/customers', passport.authenticate('jwt', { session: false }), customersRouter);
router.use('/customers', customersRouter);
router.use('/employees', employeesRouter);
router.use('/vouchers', vouchersRouter);

export default router;
