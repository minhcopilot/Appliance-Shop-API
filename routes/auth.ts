import express, { NextFunction, Request, Response } from 'express';
import { AppDataSource } from '../data-source';
const JWT = require('jsonwebtoken');
const router = express.Router();
const jwtSettings = require('../constants/jwtSettings');
const { generateToken, generateRefreshToken } = require('../utils/jwtHelper');
import { Customer } from '../entities/customer.entity';
const repository = AppDataSource.getRepository(Customer);
const passport = require('passport');

//POST login with jwt token
router.post('/login', passport.authenticate('local', { session: false }), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = req.body;
    const token = generateToken(data);
    const refreshToken = generateRefreshToken(data);
    return res.status(200).json({ token, refreshToken });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error', error: error });
  }
});
//POST REGISTER WITH JWT token

router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = req.body;
    const customer = await repository.findOneBy({ email: data.email });
    if (customer) {
      return res.status(400).json({ message: 'Account already exists' });
    }
    let newCustomer = new Customer();
    newCustomer = {
      ...newCustomer,
      ...req.body,
    };
    await repository.save(newCustomer);
    const token = generateToken(data);
    const refreshToken = generateRefreshToken(data);
    return res.status(200).json({ message: 'Register successfully', newCustomer, token, refreshToken });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error', error: error });
  }
});
//Refresh token
router.post('/refresh-token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }
    JWT.verify(refreshToken, jwtSettings.SECRET, async (err: any, user: any) => {
      if (err) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const { email } = user;
      const customer = await repository.findOneBy({ email: email });
      if (customer) {
        const data = customer;
        const token = generateToken(data);
        return res.status(200).json({ token: token });
      }
      return res.status(401).json({ error: 'Unauthorized' });
    });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});
export default router;
