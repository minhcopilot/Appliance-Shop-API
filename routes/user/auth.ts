import express, { NextFunction, Request, Response } from 'express';
import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20';
import { AppDataSource } from '../../data-source';
const JWT = require('jsonwebtoken');
const router = express.Router();
const jwtSettings = require('../../constants/jwtSettings');
const { generateToken, generateRefreshToken } = require('../../utils/jwtHelper');
import { Customer } from '../../entities/customer.entity';
const repository = AppDataSource.getRepository(Customer);
const passport = require('passport');
import * as bcrypt from 'bcrypt';
import passportGG from '../../middlewares/passportGoogle';
require('dotenv').config();

// Define a new interface extending Request
interface AuthenticatedRequest extends Request {
  user?: any; // Define user property
}
const { passportVerifyAccount } = require('../../middlewares/passport');
passport.use('local', passportVerifyAccount);

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
    const { firstName, lastName, phoneNumber, address, birthday, email, password } = req.body.newCustomer;
    const customer = await repository.findOneBy({ email: email });
    if (customer) {
      return res.status(400).json({ message: 'Account already exists' });
    }
    console.log('««««« firstName »»»»»', firstName);
    const hash = await bcrypt.hash(password, 10);
    console.log('««««« 2 »»»»»');

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
    console.log('««««« error »»»»»', error);
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

//login with google
router.get('/google', passportGG.authenticate('google', { scope: ['profile', 'email'], session: false }));

router.get('/google/callback', (req, res, next) => {
  passportGG.authenticate('google', (err: any, profile: Profile) => {
    if (err) {
      // Handle authentication errors gracefully
      console.error('Error during Google authentication:', err);
      return res.status(500).send('Authentication failed'); // Or redirect to an error page
    }

    res.redirect('http://localhost:3000/?user=' + JSON.stringify(profile));
  })(req, res, next);
});
export default router;
