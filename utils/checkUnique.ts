import { Model, Document } from 'mongoose';
import { excludeKeywords } from '../constants/excludeKeywords';

export const checkUnique = async (data: Model<any, any, any, any, any, any>, body: any, key: string) => {
  try {
    let found = await data.findOne({ [key]: body[key] }).lean();
    if (found || excludeKeywords.includes(body[key])) {
      return false;
    } else {
      return true;
    }
  } catch (error) {
    console.log(error);
  }
};
