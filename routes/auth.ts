import express, { NextFunction, Request, Response } from 'express';
import { AppDataSource } from '../data-source';
const JWT = require('jsonwebtoken');
const router = express.Router();
const jwtSettings = require('../constants/jwtSettings');
const { generateToken, generateRefreshToken } = require('../utils/jwtHelper');
import { Customer } from '../entities/customer.entity';
const repository = AppDataSource.getRepository(Customer);
const passport = require('passport');
import * as bcrypt from 'bcrypt';

// Define a new interface extending Request
interface AuthenticatedRequest extends Request {
  user?: any; // Define user property
}

//POST login with jwt token
router.post('/login', passport.authenticate('local', { session: false }), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authenticatedUser = req.user;
    const token = generateToken(authenticatedUser);
    const user: any = await repository.findOneBy({ email: authenticatedUser.email });
    const refreshToken = generateRefreshToken(user.id);
    return res.status(200).json({ token, refreshToken });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error', error: error });
  }
});
//POST REGISTER WITH JWT token

router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { firstName, lastName, phoneNumber, address, birthday, email, password } = req.body;
    const customer = await repository.findOneBy({ email: email });
    if (customer) {
      return res.status(400).json({ message: 'Account already exists' });
    }
    const hash = await bcrypt.hash(password, 10);
    const newCustomer = {
      firstName: firstName,
      lastName: lastName,
      phoneNumber: phoneNumber,
      address: address,
      birthday: birthday,
      email: email,
      password: hash,
    };
    await repository.save(newCustomer);
    const tokenCustomer = {
      firstName: firstName,
      lastName: lastName,
      phoneNumber: phoneNumber,
      address: address,
      birthday: birthday,
      email: email,
    };
    const token = generateToken(tokenCustomer);
    const user: any = await repository.findOneBy({ email: email });
    const refreshToken = generateRefreshToken(user.id);
    return res.status(200).json({ message: 'Register successfully', Customer: tokenCustomer, token, refreshToken });
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
      const { id } = user;
      const customer = await repository.findOneBy({ id: id });
      if (customer) {
        const { firstName, lastName, phoneNumber, address, birthday, email } = customer;
        const tokenCustomer = {
          firstName: firstName,
          lastName: lastName,
          phoneNumber: phoneNumber,
          address: address,
          birthday: birthday,
          email: email,
        };
        const token = generateToken(tokenCustomer);
        return res.status(200).json({ token: token });
      }
      return res.status(401).json({ error: 'Unauthorized' });
    });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});
export default router;
