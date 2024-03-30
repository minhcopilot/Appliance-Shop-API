import { Model, Document } from 'mongoose';

export const checkUnique = async (data: Model<any, any, any, any, any, any>, body: any, key: string) => {
  try {
    let found = await data.findOne({ [key]: body[key] }).lean();
    if (found) {
      return false;
    } else {
      return true;
    }
  } catch (error) {
    console.log(error);
  }
};
