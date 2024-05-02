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

// Client get all post
PostsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await Post.find({ status: 'published' }).lean({ virtuals: true }).populate(['commentsCount', 'category']));
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Database Error' });
  }
});

// Admin get all posts
PostsRouter.get('/all', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await Post.find().lean({ virtuals: true }).populate(['commentsCount', 'category']));
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Database Error' });
  }
});

//Client post search
PostsRouter.get('/search/:searchString', async (req: Request, res: Response) => {
  const searchString = req.params.searchString;
  let query = {
    $or: [
      { title: { $regex: searchString, $options: 'i' } },
      { content: { $regex: searchString, $options: 'i' } },
      { authorName: { $regex: searchString, $options: 'i' } },
      { status: 'published' },
    ],
  };
  try {
    let found = await Post.find(query);
    found.length > 0 ? res.json(found) : res.status(410).json({ message: `Couldn't find any post like that` });
  } catch (error) {
    res.status(500).json({ message: 'Database Error' });
  }
});

//Admin post search
PostsRouter.get('/search/query', async (req: Request, res: Response) => {
  let query: { [index: string]: any } = {};
  for (var queryKey in req.query) {
    if (queryKey in postSchema.fields)
      try {
        await validateSchemaByField(postSchema, req.query, queryKey);
        query[queryKey] = { $regex: req.query[queryKey], $options: 'i' };
      } catch (error: any) {
        return res.status(400).json(error.errors);
      }
  }
  // if (db == "order") {
  //   query = { ...query, ...(await ordersQuery(req.query)) };
  // }
  try {
    let found = await Post.find(query);
    found.length > 0 ? res.json(found) : res.status(410).json({ message: `Couldn't find any post like that` });
  } catch (error) {
    res.status(500).json({ message: 'Database Error' });
  }
});

//Client get post by url
PostsRouter.get('/:url', async (req: Request, res: Response, next: NextFunction) => {
  const url = req.params.url;
  try {
    let postData = await Post.findOne({ url, status: 'published' }).lean({ virtuals: true }).populate(['commentsCount', 'category']);
    postData ? res.json(postData) : res.status(404).json({ message: `Couldn't find that post` });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ message: 'Database Error' });
  }
});

//Admin get post by url or id
PostsRouter.get('/all/:url', async (req: Request, res: Response, next: NextFunction) => {
  const url = req.params.url;
  try {
    let postData = await Post.findOne({ $or: [{ _id: url }, { url: url }] })
      .lean({ virtuals: true })
      .populate(['commentsCount', 'category']);

    postData ? res.json(postData) : res.status(404).json({ message: `Couldn't find that post` });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ message: 'Database Error' });
  }
});

//Client get post comments
PostsRouter.get('/:url/comments', async (req: Request, res: Response, next: NextFunction) => {
  const url = req.params.url;
  try {
    let lookupPost = {
      $lookup: {
        from: 'posts',
        localField: 'postId',
        foreignField: '_id',
        pipeline: [
          {
            $project: { url: 1 },
          },
        ],
        as: 'posts',
      },
    };
    let found = await Comment.aggregate([lookupPost, { $unwind: '$posts' }, { $match: { $or: [{ _id: url }, { url: url }], status: 'approved' } }]).project({
      posts: 0,
    });
    res.json(found);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Database Error' });
  }
});

//Admin get post comments
PostsRouter.get('/:url/comments/all', async (req: Request, res: Response, next: NextFunction) => {
  const url = req.params.url;
  try {
    let lookupPost = {
      $lookup: {
        from: 'posts',
        localField: 'postId',
        foreignField: '_id',
        pipeline: [
          {
            $project: { url: 1 },
          },
        ],
        as: 'posts',
      },
    };
    let found = await Comment.aggregate([lookupPost, { $unwind: '$posts' }, { $match: { 'posts.url': url } }]).project({ posts: 0 });
    res.json(found);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Database Error' });
  }
});

//Client post comment
PostsRouter.post('/:url/comments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await validateSchema(commentSchema, req.body);
    try {
      let post = await Post.findOne({ url: req.params.url }).lean();
      if (!post) {
        return res.status(404).json({ message: `Couldn't find that post` });
      }
      if (post.commentStatus === 'closed') {
        return res.status(403).json({ message: `Comment is closed for this post` });
      }
      let { status = '', ...newbody } = { ...req.body, postId: post?._id }; // Omit the status property from the newbody object to prevent user manipulation
      const newItem = new Comment(newbody);
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

//Client post like by url
PostsRouter.post('/:url/like', async (req: Request, res: Response) => {
  const url = req.params.url;
  try {
    let found = await Post.findOne({ url });
    if (!found) {
      return res.status(404).json({ message: `Couldn't find that post` });
    }
    found.like += 1;
    found.save();
    return res.json({ message: 'Post liked successfully' });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: 'Database Error' });
  }
});

//Admin check unique
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

// Admin post create
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

//Admin post delete
PostsRouter.delete('/all/:url', async (req: Request, res: Response) => {
  const url = req.params.url;
  try {
    let idData = await Post.findOneAndDelete({ $or: [{ _id: url }, { url: url }] });
    idData ? res.json({ message: 'Post Post deleted successfully' }) : res.status(404).json({ message: `Couldn't find that Post Post` });
  } catch (error) {
    res.status(500).json({ message: 'Database Error' });
  }
});

//Admin post update
PostsRouter.patch('/all/:url', async (req, res) => {
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
      body.title && (body.url = urlGenerate(body.title));
      let idData = await Post.findOneAndUpdate({ $or: [{ _id: url }, { url: url }] }, body);
      if (idData) {
        if (req.body.file) {
          console.log(req.body.file[0]);
          await fileUpload(idData?._id, req, res, Post);
        }
        return res.json({ message: `Post Post updated successfully` });
      } else res.status(404).json({ message: `Couldn't find that Post Post` });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: 'Database Error' });
    }
  } catch (error) {
    console.log(error);
    return res.sendStatus(500);
  }
});

//Admin post upload image
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
