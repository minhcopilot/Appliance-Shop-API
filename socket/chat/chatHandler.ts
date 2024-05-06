import { Server, Socket } from 'socket.io';
import { chatStart } from './chatStart';
import { chatAccept } from './chatAccept';
import { sendMessage } from './sendMessage';
import { chatClose } from './chatClose';

export type socketData = {
  type: string;
  message: any;
};

export const chatHandler = async (io: Server, socket: any) => {
  if (socket.request.user?.roleCode === 'R3' || socket.request.user?.roleCode === 'R1') {
    socket.join('employees');
    console.log(socket.request.user.email + ' joined employees room');
  }
  socket.on('employee-message', (data: socketData) => {
    console.log(data);
    if (data.type === 'chat-accepted') {
      chatAccept(socket, io, data);
    }
    if (data.type === 'new-message') {
      sendMessage(socket, io, data, 'employee');
    }
  });
  socket.on('client-message', (data: socketData) => {
    console.log(data);
    if (data.type === 'start-chat') {
      chatStart(socket, io, data);
    }
    if (data.type === 'new-message') {
      sendMessage(socket, io, data, 'customer');
    }
    if (data.type === 'close-chat') {
      chatClose(socket, io, data);
    }
  });
  return () => {
    socket.off('employee-message');
    socket.off('client-message');
  };
};
