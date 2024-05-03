const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const LocalStrategy = require('passport-local').Strategy;

import { Customer } from '../entities/customer.entity';
import { AppDataSource } from '../data-source';
const repository = AppDataSource.getRepository(Customer);

const passportVerifyToken = new JwtStrategy(
  {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken('Authorization'),
    secretOrKey: process.env.SECRET,
  },
  async (payload: any, done: any) => {
    try {
      const user = await repository.findOneBy({ email: payload.email });
      if (!user) {
        return done(null, false);
      }
      return done(null, user);
    } catch (error) {
      done(error, false);
    }
  },
);

const passportVerifyAccount = new LocalStrategy(
  {
    usernameField: 'email',
  },
  async (email: string, passwordInput: string, done: any) => {
    try {
      // Find user by email
      const user = await repository.findOneBy({ email: email });
      if (!user) {
        return done(null, false); // User not found
      }

      // Validate password using the user object's method
      const isCorrectPassword = await user.validatePassword(passwordInput);
      if (!isCorrectPassword) {
        return done(null, false); // Incorrect password
      }

      const { password, ...userWithoutPassword } = user;
      // User authenticated successfully
      return done(null, userWithoutPassword);
    } catch (error) {
      return done(error, false);
    }
  },
);

export { passportVerifyToken, passportVerifyAccount };
