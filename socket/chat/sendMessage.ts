import { Server } from 'socket.io';
import { AppDataSource } from '../../data-source';
import { Chat } from '../../entities/chat.entity';
import { socketData } from './chatHandler';
import { Message } from '../../entities/message.model';

const chatRespository = AppDataSource.getRepository(Chat);

export const sendMessage = async (socket: any, io: Server, data: socketData, sender: string) => {
  try {
    let chat = await chatRespository.findOneBy({ id: data.message.chatId });
    if (chat) {
      let newMessage = { ...data.message, sender: sender }; // Omit the status property from the newbody object to prevent user manipulation
      const newItem = new Message(newMessage);
      try {
        let result = await newItem.save();
        io.to(chat.id.toString()).emit('new-message', result);
      } catch (error) {
        console.log(error);
        return socket.emit('server-message', { type: 'error', message: 'Error sending message' });
      }
    } else {
      return socket.emit('server-message', { type: 'error', message: 'Chat not found' });
    }
  } catch (error) {
    socket.emit('server-message', { type: 'error', message: 'Database Error' });
    console.error(error);
  }
};
