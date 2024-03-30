import { Request, Response } from 'express';
import { Model } from 'mongoose';
import { uploadMultiple, uploadSingle } from '../utils/upload';
import multer from 'multer';
import fs from 'fs';
import { toSafeFileName } from '../utils/toSafeFileName';

export const fileUpload = async (id: any, req: Request, res: Response, data: Model<any, any, any, any, any, any>) => {
  try {
    let found = await data.findById(id);
    if (!found) {
      return res.status(404).json({ message: `Couldn't find that ${data.modelName} id` });
    }
    req.params.collectionName = data.modelName;
    uploadSingle(req, res, async (error) => {
      if (error instanceof multer.MulterError) {
        res.status(500).json({ type: 'MulterError', message: error.message });
      } else if (error) {
        res.status(500).json({ type: 'UnknownError', message: error.message });
      } else {
        const UPLOAD_DIR = process.env.UPLOAD_DIR;
        const PUBLIC_DIR = process.env.PUBLIC_DIR;
        fs.unlink(`${PUBLIC_DIR}/${found.imageUrl}`, (err) => {
          console.log(err);
        });
        const patchData = {
          imageUrl: `/${UPLOAD_DIR}/${data.modelName}/${id}/${req.body.file.filename}`,
        };

        found.imageUrl = patchData.imageUrl;
        found.save();
        return found;
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Database Error' });
  }
};

export const filesUpload = async (id: any, req: Request, res: Response, data: Model<any, any, any, any, any, any>) => {
  try {
    let found = await data.findById(id);
    if (!found) {
      return res.status(404).json({ message: `Couldn't find that ${data.modelName} id` });
    }
    req.params.collectionName = data.modelName;
    uploadMultiple(req, res, async (error) => {
      if (error instanceof multer.MulterError) {
        res.status(500).json({ type: 'MulterError', message: error.message });
      } else if (error) {
        res.status(500).json({ type: 'UnknownError', message: error.message });
      } else {
        const UPLOAD_DIR = process.env.UPLOAD_DIR;
        const PUBLIC_DIR = process.env.PUBLIC_DIR;
        const patchData: string[] = [];
        found.imagesUrl.forEach((e: string) => {
          fs.unlink(`${PUBLIC_DIR}/${e}`, (err) => {
            console.log(err);
          });
          patchData.push(`/${UPLOAD_DIR}/${data.modelName}/${id}/${toSafeFileName(req.body.file.filename)}`);
        });
        found.imageUrl = patchData;
        found.save();
        return found;
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Database Error' });
  }
};
