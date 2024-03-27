import express, { NextFunction, Request, Response } from 'express';
import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20';
import { AppDataSource } from '../../data-source';
const JWT = require('jsonwebtoken');
const router = express.Router();
const jwtSettings = require('../../constants/jwtSettings');

const { generateToken, generateRefreshToken } = require('../../utils/jwtHelper');

import { Employee } from '../../entities/employee.entity';
const repository = AppDataSource.getRepository(Employee);
const passport = require('passport');
import * as bcrypt from 'bcrypt';
import passportGG from '../../middlewares/passportGoogle';
require('dotenv').config();
const { passportConfigLocalAdmin } = require('../../middlewares/passportAdmin');
passport.use('localAdmin', passportConfigLocalAdmin);

// Define a new interface extending Request
interface AuthenticatedRequest extends Request {
  user?: any; // Define user property
}

//POST login with jwt token
router.post('/login', passport.authenticate('localAdmin', { session: false }), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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
    const employee = await repository.findOneBy({ email: email });
    if (employee) {
      return res.status(400).json({ message: 'Account already exists' });
    }
    const hash = await bcrypt.hash(password, 10);
    const newEmployee = {
      firstName: firstName,
      lastName: lastName,
      phoneNumber: phoneNumber,
      address: address,
      birthday: birthday,
      email: email,
      password: hash,
    };
    await repository.save(newEmployee);
    const tokenEmployee = {
      firstName: firstName,
      lastName: lastName,
      phoneNumber: phoneNumber,
      address: address,
      birthday: birthday,
      email: email,
    };
    const token = generateToken(tokenEmployee);
    const user: any = await repository.findOneBy({ email: email });
    const refreshToken = generateRefreshToken(user.id);
    return res.status(200).json({ message: 'Register successfully', Employee: tokenEmployee, token, refreshToken });
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
      const employee = await repository.findOneBy({ id: id });
      if (employee) {
        const { firstName, lastName, phoneNumber, address, birthday, email } = employee;
        const tokenEmployee = {
          firstName: firstName,
          lastName: lastName,
          phoneNumber: phoneNumber,
          address: address,
          birthday: birthday,
          email: email,
        };
        const token = generateToken(tokenEmployee);
        return res.status(200).json({ token: token });
      }
      return res.status(401).json({ error: 'Unauthorized' });
    });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
