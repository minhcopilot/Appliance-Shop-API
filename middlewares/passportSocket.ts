const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const LocalStrategy = require('passport-local').Strategy;

import { Customer } from '../entities/customer.entity';
import { AppDataSource } from '../data-source';
import { Employee } from '../entities/employee.entity';
import e from 'express';
const customerRepository = AppDataSource.getRepository(Customer);
const employeeRepository = AppDataSource.getRepository(Employee);

const passportSocketVerifyToken = new JwtStrategy(
  {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken('Authorization'),
    secretOrKey: process.env.SECRET,
  },
  async (payload: any, done: any) => {
    try {
      const user = await customerRepository.findOneBy({ email: payload.email });
      if (!user) {
        const employee = await employeeRepository.findOneBy({ email: payload.email });
        if (!employee) {
          return done(null, false);
        } else {
          return done(null, employee);
        }
      }
      return done(null, user);
    } catch (error) {
      done(error, false);
    }
  },
);

export { passportSocketVerifyToken };
