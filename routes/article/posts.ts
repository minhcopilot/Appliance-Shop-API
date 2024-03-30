import express, { NextFunction, Request, Response } from 'express';
import { checkUnique } from '../../utils/checkUnique';
import { validateSchema, validateSchemaByField } from '../../utils/validateSchema';
import { fileUpload } from '../fileUpload';
import { urlGenerate } from '../../utils/urlGenerate';
import { uploadSingle } from '../../utils/upload';
import multer from 'multer';
import { Post, postSchema } from '../../entities/post.model';
import { Comment, commentSchema } from '../../entities/comment.model';
export const PostsRouter = express.Router();

PostsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await Post.find().lean({ virtuals: true }).populate('comments'));
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Database Error' });
  }
});

PostsRouter.get('/:url', async (req: Request, res: Response, next: NextFunction) => {
  const url = req.params.url;
  try {
    let postData = await Post.findOne({ url }).lean({ virtuals: true }).populate('comments');
    postData ? res.json(postData) : res.status(404).json({ message: `Couldn't find that post` });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ message: 'Database Error' });
  }
});

PostsRouter.get('/:url/comments', async (req: Request, res: Response, next: NextFunction) => {
  const url = req.params.url;
  try {
    res.json(await Comment.find().lean({ virtuals: true }));
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Database Error' });
  }
});

PostsRouter.post('/:url/comments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await validateSchema(commentSchema, req.body);
    try {
      let postId = (await Post.findOne({ url: req.params.url }).lean())?._id;
      if (!postId) {
        return res.status(404).json({ message: `Couldn't find that post` });
      }
      const newItem = new Comment({ ...req.body, postId });
      try {
        let result = await newItem.save();
        return res.status(201).json(result);
      } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Database Error' });
      }
    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: 'Database Error' });
    }
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }
});

PostsRouter.post('/check-unique', async (req, res) => {
  const body = req.body;
  let uniqueError = [];
  for (const key in body) {
    if (key in postSchema.fields) {
      try {
        let isUnique = await checkUnique(Post, body, key);
        !isUnique && uniqueError.push(key);
      } catch (error) {
        console.log(error);
        return res.sendStatus(500);
      }
    } else {
      return res.status(400).json({ message: `'${key}' is invalid Post Post field` });
    }
  }
  return res.json(uniqueError);
});

PostsRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { file, ...body } = req.body;
    await validateSchema(postSchema, body);
    try {
      let isUnique = await checkUnique(Post, body, 'title');
      if (!isUnique) {
        return res.status(400).json({ message: 'title must be unique' });
      }
      const newItem = new Post({ ...body, url: urlGenerate(body.title) });
      try {
        let result = await newItem.save();
        if (file) {
          let found = await fileUpload(result._id, req, res, Post);
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

PostsRouter.delete('/:url', async (req: Request, res: Response) => {
  const url = req.params.url;
  try {
    let idData = await Post.findOneAndDelete({ url });
    idData ? res.json({ message: 'Post Post deleted successfully' }) : res.status(404).json({ message: `Couldn't find that Post Post` });
  } catch (error) {
    res.status(500).json({ message: 'Database Error' });
  }
});

PostsRouter.patch('/:url', async (req, res) => {
  const url = req.params.url;
  const { file, ...body } = req.body;
  let inputError = [];
  for (const key in body) {
    if (key in postSchema.fields) {
      try {
        await validateSchemaByField(postSchema, body, key);
      } catch (error: any) {
        inputError.push(error.errors);
      }
    }
  }
  if (inputError.length > 0) {
    return res.status(400).json({ message: inputError.toString() });
  }
  try {
    let isUnique = await checkUnique(Post, body, 'title');
    if (!isUnique) {
      return res.status(400).json({ message: 'title must be unique' });
    }
    try {
      let idData = await Post.findOneAndUpdate({ url }, { ...body, url: urlGenerate(body.title) });
      if (idData) {
        if (req.body.file) {
          console.log(req.body.file[0]);
          await fileUpload(idData?._id, req, res, Post);
        }
        return res.json({ message: `Post Post updated successfully` });
      } else res.status(404).json({ message: `Couldn't find that Post Post` });
    } catch (error) {
      res.status(500).json({ message: 'Database Error' });
    }
  } catch (error) {
    console.log(error);
    return res.sendStatus(500);
  }
});

PostsRouter.post('/:url/upload', async (req, res) => {
  const url = req.params.url;
  try {
    let found = await Post.findOne({ url });
    if (!found) {
      return res.status(404).json({ message: `Couldn't find that Post Post id` });
    }
    req.params = { ...req.params, collectionName: 'post' } as { url: string; collectionName: string };
    uploadSingle(req, res, async (error: any) => {
      if (error instanceof multer.MulterError) {
        return res.status(500).json({ type: 'MulterError', message: error.message });
      } else if (error) {
        return res.status(500).json({ type: 'UnknownError', message: error.message });
      } else {
        const UPLOAD_DIR = process.env.UPLOAD_DIR;
        const patchData = {
          imageUrl: `/${UPLOAD_DIR}/posts/${url}/${req.body.file?.filename}`,
        };
        const publicUrl = `${req.protocol}://${req.get('host')}/${UPLOAD_DIR}/posts/${url}/${req.body.file?.filename}`;
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
