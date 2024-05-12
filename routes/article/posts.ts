import express, { NextFunction, Request, Response } from 'express';
import { checkUnique } from '../../utils/checkUnique';
import { validateSchema, validateSchemaByField } from '../../utils/validateSchema';
import { urlGenerate } from '../../utils/urlGenerate';
import { Post, postSchema } from '../../entities/post.model';
import { Comment, commentSchema } from '../../entities/comment.model';
import { allowRoles } from '../../middlewares/verifyRoles';
import passport from 'passport';
import { uploadCloud } from '../../middlewares/fileMulter';
import cloudinary from '../../utils/cloudinary';
import { ImageUrl, imageUrl } from '../../entities/postImage.model';
import { stripContent, stripTags } from '../../utils/striphtmltag';
const { passportConfigAdmin } = require('../../middlewares/passportAdmin');
export const PostsRouter = express.Router();

passport.use('admin', passportConfigAdmin);

// Client get all post
PostsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await Post.find({ status: 'published' })
      .lean({ virtuals: true })
      .populate([{ path: 'commentsCount', match: { status: 'approved' } }, 'category']);
    const stripcontent = result.map((post: any) => {
      return { ...post, content: stripContent(stripTags(post.content), 30) };
    });
    res.json(stripcontent);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Database Error' });
  }
});

// Admin get all posts
PostsRouter.get('/all', passport.authenticate('admin', { session: false }), allowRoles('R1', 'R3'), async (req: Request, res: Response, next: NextFunction) => {
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
    $and: [
      {
        $or: [
          { title: { $regex: searchString, $options: 'i' } },
          { content: { $regex: searchString, $options: 'i' } },
          { authorName: { $regex: searchString, $options: 'i' } },
        ],
      },
      { status: 'published' },
    ],
  };
  try {
    let found = await Post.find(query);
    return res.json(found);
  } catch (error) {
    return res.status(500).json({ message: 'Database Error' });
  }
});

//Admin post search
PostsRouter.get('/all/search/query', passport.authenticate('admin', { session: false }), allowRoles('R1', 'R3'), async (req: Request, res: Response) => {
  let query: { [index: string]: any } = {};
  for (var queryKey in req.query) {
    if (queryKey in postSchema.fields)
      try {
        await validateSchemaByField(postSchema, req.query, queryKey);
        query[queryKey] = req.query[queryKey];
      } catch (error: any) {
        return res.status(400).json(error.errors);
      }
  }
  try {
    let found = await Post.find(query);
    return res.json(found);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: 'Database Error' });
  }
});

//Client get post by url
PostsRouter.get('/:url', async (req: any, res: Response, next: NextFunction) => {
  const url = req.params.url;
  try {
    let postData = await Post.findOne({ url, status: 'published' }).populate(['commentsCount', 'category']);
    if (!postData) {
      return res.status(404).json({ message: `Couldn't find that post` });
    }
    //increase view count
    if (!req.session.views) {
      req.session.views = {};
    }
    console.log(req.session);
    if (req.session.views[String(postData._id)] !== true) {
      postData.view += 1;
      postData.save();
      req.session.views[String(postData._id)] = true;
    }
    res.json(postData);
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ message: 'Database Error' });
  }
});

//Admin get post by url or id
PostsRouter.get(
  '/all/:url',
  passport.authenticate('admin', { session: false }),
  allowRoles('R1', 'R3'),
  async (req: Request, res: Response, next: NextFunction) => {
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
  },
);

//Client get post comments
PostsRouter.get('/:url/comments', async (req: Request, res: Response, next: NextFunction) => {
  const url = req.params.url;
  try {
    let lookupPost = {
      $lookup: {
        from: 'posts',
        localField: 'postId',
        foreignField: '_id',
        as: 'posts',
        pipeline: [
          {
            $project: { url: 1 },
          },
        ],
      },
    };
    let found = await Comment.aggregate([lookupPost, { $unwind: '$posts' }, { $match: { 'posts.url': url, status: 'approved' } }]).project({ posts: 0 });
    res.json(found);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Database Error' });
  }
});

//Admin get post comments
PostsRouter.get(
  '/all/:url/comments',
  passport.authenticate('admin', { session: false }),
  allowRoles('R1', 'R3'),
  async (req: Request, res: Response, next: NextFunction) => {
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
      let found = await Comment.aggregate([lookupPost, { $unwind: '$posts' }, { $match: { $or: [{ 'posts.url': url }, { postId: url }] } }]).project({
        posts: 0,
      });
      res.json(found);
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: 'Database Error' });
    }
  },
);

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
PostsRouter.post('/:url/like', async (req: any, res: Response) => {
  const url = req.params.url;
  const like = req.body.like;
  if (typeof like !== 'boolean') {
    return res.status(400).json({ message: 'Invalid like value' });
  }
  try {
    let found = await Post.findOne({ url });
    if (!found) {
      return res.status(404).json({ message: `Couldn't find that post` });
    }
    if (!req.session.likes) {
      req.session.likes = {};
    }
    if (like === undefined) return res.send(req.session.likes[String(found._id)] || false);
    if (req.session.likes[String(found._id)] === true) {
      if (like) {
        return res.send(true);
      } else {
        req.session.likes[String(found._id)] = false;
        found.like -= 1;
      }
    } else {
      if (!like) {
        return res.send(false);
      } else {
        req.session.likes[String(found._id)] = true;
        found.like += 1;
      }
    }
    found.save();
    res.send(req.session.likes[String(found._id)]);
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
      return res.status(400).json({ message: `'${key}' is invalid Post field` });
    }
  }
  return res.json(uniqueError);
});

PostsRouter.post('/check-unique/:id', async (req, res) => {
  const body = req.body;
  const id = req.params.id;
  let uniqueError = [];
  for (const key in body) {
    if (key in postSchema.fields) {
      try {
        let isUnique = await checkUnique(Post, body, key, id);
        !isUnique && uniqueError.push(key);
      } catch (error) {
        console.log(error);
        return res.sendStatus(500);
      }
    } else {
      return res.status(400).json({ message: `'${key}' is invalid Post field` });
    }
  }
  return res.json(uniqueError);
});

// Admin post create
PostsRouter.post(
  '/all/',
  passport.authenticate('admin', { session: false }),
  allowRoles('R1', 'R3'),
  uploadCloud.single('file'),
  async (req: any, res: Response, next: NextFunction) => {
    try {
      await validateSchema(postSchema, req.body);
      try {
        let isUnique = await checkUnique(Post, req.body, 'title');
        if (!isUnique) {
          return res.status(400).json({ message: 'title must be unique' });
        }
        const dataInsert = { ...req.body, authorId: req.user?.id, authorName: req.user?.firstName + ' ' + req.user?.lastName };
        if (req.file) {
          const result = await cloudinary.uploader.upload(req.file.path, {
            folder: 'posts',
          });
          const imageUrl = {
            url: result.secure_url,
            publicId: result.public_id,
            name: result.original_filename,
            size: result.bytes,
          };
          dataInsert.imageUrl = imageUrl;
        }
        !req.body.url && (dataInsert.url = urlGenerate(req.body.title));
        const newItem = new Post(dataInsert);
        try {
          let result = await newItem.save();
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
  },
);

//Admin post delete
PostsRouter.delete('/all/:url', passport.authenticate('admin', { session: false }), allowRoles('R1', 'R3'), async (req: Request, res: Response) => {
  const url = req.params.url;
  try {
    let idData = await Post.findOneAndDelete({ $or: [{ _id: url }, { url: url }] });
    idData ? res.json({ message: 'Post Post deleted successfully' }) : res.status(404).json({ message: `Couldn't find that Post Post` });
  } catch (error) {
    res.status(500).json({ message: 'Database Error' });
  }
});

//Admin post update
PostsRouter.patch(
  '/all/:id',
  passport.authenticate('admin', { session: false }),
  allowRoles('R1', 'R3'),
  uploadCloud.single('file'),
  async (req: any, res: Response) => {
    const id = req.params.id;
    let inputError = [];
    for (const key in req.body) {
      if (key in postSchema.fields) {
        try {
          await validateSchemaByField(postSchema, req.body, key);
        } catch (error: any) {
          inputError.push(error.errors);
        }
      }
    }
    if (inputError.length > 0) {
      return res.status(400).json({ message: inputError.toString() });
    }
    try {
      let isUnique = await checkUnique(Post, req.body, 'title', id);
      if (!isUnique) {
        return res.status(400).json({ message: 'title must be unique' });
      }

      try {
        const dataInsert = { ...req.body, updatedBy: req.user?.firstName + ' ' + req.user?.lastName };
        if (req.file) {
          const result = await cloudinary.uploader.upload(req.file.path, {
            folder: 'products',
          });
          const imageUrl = {
            url: result.secure_url,
            publicId: result.public_id,
            name: result.original_filename,
            size: result.bytes,
          };
          dataInsert.imageUrl = imageUrl;
        }
        req.body.title && !req.body.url && (dataInsert.url = urlGenerate(req.body.title));
        let idData = await Post.findOneAndUpdate({ $or: [{ _id: id }, { url: id }] }, dataInsert);
        if (idData) {
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
  },
);

//Admin post upload image
PostsRouter.post('/all/upload', passport.authenticate('admin', { session: false }), allowRoles('R1', 'R3'), uploadCloud.single('file'), async (req, res) => {
  const postId = req.body.postId;
  try {
    if (req.file) {
      try {
        const upload = await cloudinary.uploader.upload(req.file.path, {
          folder: 'postContents',
        });
        let imageUrl: imageUrl = {
          url: upload.secure_url,
          publicId: upload.public_id,
          name: upload.original_filename,
          size: upload.bytes,
        };
        if (postId !== undefined) {
          let found = await Post.findOne({ postId });
          if (!found) {
            return res.status(404).json({ message: `Couldn't find that Post Post id` });
          }
          imageUrl = { ...imageUrl, postId: found._id };
        }
        let newItem = new ImageUrl(imageUrl);
        let result = await newItem.save();
        return res.status(201).json(result);
      } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Database Error' });
      }
    }
  } catch (error) {
    return res.status(500).json({ message: 'Database Error' });
  }
});
