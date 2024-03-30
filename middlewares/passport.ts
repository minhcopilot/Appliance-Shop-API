const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
import { VerifyCallback } from 'passport-google-oauth20';

const jwtSettings = require('../constants/jwtSettings');
import { Customer } from '../entities/customer.entity';
import { AppDataSource } from '../data-source';
const repository = AppDataSource.getRepository(Customer);

const passportVerifyToken = new JwtStrategy(
  {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken('Authorization'),
    secretOrKey: jwtSettings.SECRET,
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
      // Handle errors appropriately
      console.error('Error during authentication:', error);
      return done(error, false);
    }
  },
);

// module.exports = {
//   passportVerifyToken,
//   passportVerifyAccount,
// };
export { passportVerifyToken, passportVerifyAccount };
