#!/usr/bin/env node

/**
 * Module dependencies.
 */

import app from '../app';
const debug = require('debug')('express-typescript:server');
import http from 'http';

/**
 * Get port from environment and store in Express.
 */

const port = normalizePort(process.env.PORT || '9000');
app.set('port', port);

/**
 * Create HTTP server.
 */

const server = http.createServer(app);

/**
 * Socket.io
 */

import { Server } from 'socket.io';
import { chatStart } from '../socket/chatStart';
import passport from 'passport';
import { passportVerifyToken } from '../middlewares/passport';
import { NextFunction } from 'express';
const io = new Server(server, {
  cors: {
    origin: true,
    credentials: true,
  },
});

//Use JWT Auth Middleware
passport.use('jwt', passportVerifyToken);
io.engine.use((req: any, res: Response, next: NextFunction) => {
  const isHandshake = req._query.sid === undefined;
  if (isHandshake) {
    passport.authenticate('jwt', { session: false })(req, res, next);
  } else {
    next();
  }
});

io.on('connection', (socket) => {
  console.log('a user connected');
  console.log(socket.request);
  socket.on('client-message', (msg) => {
    console.log('message: ' + msg);
    if (msg.type === 'start') {
      chatStart(socket, io);
    }
  });
  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val: any) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error: any) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  const address = server.address();
  const bind = typeof address === 'string' ? 'pipe ' + address : 'port ' + address?.port;
  debug('Listening on ' + bind);
}
