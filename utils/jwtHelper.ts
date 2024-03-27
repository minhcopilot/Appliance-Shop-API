const JWT = require('jsonwebtoken');
const jwtSettings = require('../constants/jwtSettings');

const generateToken = (payload: any) => {
  const expiresIn = '1d';
  const algorithm = 'HS256';

  return JWT.sign(
    {
      iat: Math.floor(Date.now() / 1000),
      ...payload,
      algorithm,
    },
    jwtSettings.SECRET,
    {
      expiresIn,
    },
  );
};

const generateRefreshToken = (payload: any) => {
  const expiresIn = '365d';

  return JWT.sign(
    {
      id: payload,
    },
    jwtSettings.SECRET,
    {
      expiresIn,
    },
  );
};

module.exports = {
  generateToken,
  generateRefreshToken,
};
