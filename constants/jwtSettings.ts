import { Secret } from 'jsonwebtoken';

export default {
  SECRET: process.env.SECRET as Secret,
};
