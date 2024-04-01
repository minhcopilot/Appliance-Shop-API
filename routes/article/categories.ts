import express, { NextFunction, Request, Response } from 'express';
import { PostCategory, postCategorySchema } from '../../entities/post-category.model';
import { checkUnique } from '../../utils/checkUnique';
import { validateSchema, validateSchemaByField } from '../../utils/validateSchema';
import { fileUpload } from '../fileUpload';
import { urlGenerate } from '../../utils/urlGenerate';
import { uploadSingle } from '../../utils/upload';
import multer from 'multer';
export const PostCategoriesRouter = express.Router();

//Client get all post categories
PostCategoriesRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await PostCategory.find({ isDeleted: false }).lean({ virtuals: true }).populate('postCount'));
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Database Error' });
  }
});

//Admin get all post categories
PostCategoriesRouter.get('/all', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await PostCategory.find().lean({ virtuals: true }).populate('postCount'));
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Database Error' });
  }
});

//Client get post category by url
PostCategoriesRouter.get('/:url', async (req: Request, res: Response, next: NextFunction) => {
  const url = req.params.url;
  try {
    let categoryData = await PostCategory.findOne({ url, isDeleted: false }).lean({ virtuals: true }).populate('postCount');
    categoryData ? res.json(categoryData) : res.status(404).json({ message: `Couldn't find that category` });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ message: 'Database Error' });
  }
});

//Admin get post category by url
PostCategoriesRouter.get('/all/:url', async (req: Request, res: Response, next: NextFunction) => {
  const url = req.params.url;
  try {
    let categoryData = await PostCategory.findOne({ url }).lean({ virtuals: true }).populate('postCount');
    categoryData ? res.json(categoryData) : res.status(404).json({ message: `Couldn't find that category` });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ message: 'Database Error' });
  }
});

//Admin check unique, return array of not unique fields
PostCategoriesRouter.post('/check-unique', async (req, res) => {
  const body = req.body;
  let uniqueError = [];
  for (const key in body) {
    if (key in postCategorySchema.fields) {
      try {
        let isUnique = await checkUnique(PostCategory, body, key);
        !isUnique && uniqueError.push(key);
      } catch (error) {
        console.log(error);
        return res.sendStatus(500);
      }
    } else {
      return res.status(400).json({ message: `'${key}' is invalid Post Category field` });
    }
  }
  return res.json(uniqueError);
});

//Admin create post category
PostCategoriesRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { file, ...body } = req.body;
    await validateSchema(postCategorySchema, body);
    try {
      let isUnique = await checkUnique(PostCategory, body, 'title');
      if (!isUnique) {
        return res.status(400).json({ message: 'title must be unique' });
      }
      const newItem = new PostCategory({ ...body, url: urlGenerate(body.title) });
      try {
        let result = await newItem.save();
        if (file) {
          let found = await fileUpload(result._id, req, res, PostCategory);
          return res.status(201).json(found);
        }
        return res.status(201).json(result);
      } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Database Error' });
      }
    } catch (error) {
      console.log(error);
      return res.sendStatus(500);
    }
  } catch (error: any) {
    console.log(error.message);
    res.status(400).json({ message: error.errors?.toString() });
  }
});

//Admin delete post category by url
PostCategoriesRouter.delete('/:url', async (req: Request, res: Response) => {
  const url = req.params.url;
  try {
    let idData = await PostCategory.findOneAndDelete({ url });
    idData ? res.json({ message: 'Post Category deleted successfully' }) : res.status(404).json({ message: `Couldn't find that Post Category` });
  } catch (error) {
    res.status(500).json({ message: 'Database Error' });
  }
});

//Admin update post category by url
PostCategoriesRouter.patch('/:url', async (req, res) => {
  const url = req.params.url;
  const { file, ...body } = req.body;
  let inputError = [];
  for (const key in body) {
    if (key in postCategorySchema.fields) {
      try {
        await validateSchemaByField(postCategorySchema, body, key);
      } catch (error: any) {
        inputError.push(error.errors);
      }
    }
  }
  if (inputError.length > 0) {
    return res.status(400).json({ message: inputError.toString() });
  }
  try {
    let isUnique = await checkUnique(PostCategory, body, 'title');
    if (!isUnique) {
      return res.status(400).json({ message: 'title must be unique' });
    }
    try {
      let idData = await PostCategory.findOneAndUpdate({ url }, { ...body, url: urlGenerate(body.title) });
      if (idData) {
        if (req.body.file) {
          console.log(req.body.file[0]);
          await fileUpload(idData?._id, req, res, PostCategory);
        }
        return res.json({ message: `Post Category updated successfully` });
      } else res.status(404).json({ message: `Couldn't find that Post Category` });
    } catch (error) {
      res.status(500).json({ message: 'Database Error' });
    }
  } catch (error) {
    console.log(error);
    return res.sendStatus(500);
  }
});

//Admin upload image to post category by url
PostCategoriesRouter.post('/:url/upload', async (req, res) => {
  const url = req.params.url;
  try {
    let found = await PostCategory.findOne({ url });
    if (!found) {
      return res.status(404).json({ message: `Couldn't find that Post Category id` });
    }
    req.params = { ...req.params, collectionName: 'postcategory' } as { url: string; collectionName: string };
    uploadSingle(req, res, async (error: any) => {
      if (error instanceof multer.MulterError) {
        return res.status(500).json({ type: 'MulterError', message: error.message });
      } else if (error) {
        return res.status(500).json({ type: 'UnknownError', message: error.message });
      } else {
        const UPLOAD_DIR = process.env.UPLOAD_DIR;
        const patchData = {
          imageUrl: `/${UPLOAD_DIR}/postcategory/${url}/${req.body.file?.filename}`,
        };
        const publicUrl = `${req.protocol}://${req.get('host')}/${UPLOAD_DIR}/postcategory/${url}/${req.body.file?.filename}`;
        try {
          await found?.updateOne(patchData);
          return res.json({ message: 'File uploaded successfully', publicUrl });
        } catch (error) {
          return res.status(500).json({ message: 'Database Error' });
        }
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Database Error' });
  }
});
