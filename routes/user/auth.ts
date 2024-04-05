import express, { NextFunction, Request, Response } from 'express';
import { Profile } from 'passport-google-oauth20';
import { AppDataSource } from '../../data-source';
import JWT from 'jsonwebtoken';
const router = express.Router();
import { generateToken, generateRefreshToken } from '../../utils/jwtHelper';
import { Customer } from '../../entities/customer.entity';
const repository = AppDataSource.getRepository(Customer);
import passport from 'passport';
import * as bcrypt from 'bcrypt';
import passportGG from '../../middlewares/passportGoogle';
import passportFB from '../../middlewares/passportFB';
import { parseISO, format } from 'date-fns';
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
  } catch (error: any) {
    return res.status(500).json({ message: 'Internal server error', errors: error });
  }
});
//POST REGISTER WITH JWT token

router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { firstName, lastName, phoneNumber, address, birthday, email, password } = req.body;
    const formattedBirthday = format(new Date(birthday), 'yyyy-MM-dd');
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
      birthday: formattedBirthday,
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
  } catch (error: any) {
    return res.status(500).json({ message: 'Internal server error', errors: error });
  }
});
//Refresh token
router.post('/refresh-token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }
    JWT.verify(refreshToken, process.env.SECRET as string, async (err: any, user: any) => {
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
      return res.status(500).send('Authentication failed');
    }
    req.user = profile;
    //@ts-ignore
    res.redirect(`${process.env.CLIENT_URL}/login-success/` + req.user?.email);
  })(req, res, next);
});

//login with facebook
router.get('/facebook', passportFB.authenticate('facebook', { scope: ['email'] }));

router.get('/facebook/callback', (req, res, next) => {
  passportFB.authenticate('facebook', (err: any, profile: Profile) => {
    if (err) {
      return res.status(500).send('Authentication failed');
    }
    req.user = profile;
    //@ts-ignore
    res.redirect(`${process.env.CLIENT_URL}/login-success/` + req.user?.email);
  })(req, res, next);
});

router.post('/login-success', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req?.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    const customer = await repository.findOneBy({ email: email });
    if (customer) {
      const token = generateToken(customer);
      const refreshToken = generateRefreshToken(customer.email);
      return res.status(200).json({ token, refreshToken });
    }
  } catch (error: any) {
    return res.status(500).json({ error: 'Internal server error', errors: error });
  }
});
export default router;
