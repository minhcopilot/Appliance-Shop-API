import { Server, Socket } from 'socket.io';
import { AppDataSource } from '../data-source';
import { Chat } from '../entities/chat.entity';

const chatRespository = AppDataSource.getRepository(Chat);

export const chatStart = async (socket: Socket, io: Server) => {
  const createChat = async (msg: any) => {
    let newChat = new Chat();
    try {
      await chatRespository.save(newChat);
      socket.join(newChat.id.toString());
      io.to('employees').emit('server-message', { type: 'chat-started', chatId: newChat.id });
    } catch (error) {
      socket.emit('server-message', { type: 'error', message: 'Error creating chat' });
      console.error(error);
    }
  };
  return createChat;
};
