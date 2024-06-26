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
import { PostCategory } from '../../entities/post-category.model';
import { verifyRecaptcha } from '../../controllers/customer';
import axios from 'axios';
import { Message } from '../../entities/message.model';
const { passportVerifyToken } = require('../../middlewares/passport');
export const PostsRouter = express.Router();

passport.use('admin', passportVerifyToken);

// Client get all post
PostsRouter.get('/', async (req: any, res: Response, next: NextFunction) => {
  const pagination = req.query.pagination || 'true';
  const page = pagination === 'false' ? undefined : parseInt(req.query.page as string) || 1;
  const limit = pagination === 'false' ? undefined : parseInt(req.query.limit as string) || 10;
  const authorId: number = req.query.authorId;
  const { category, search, type, sort } = req.query;
  const query: any = {};
  const paginateOptions: any = {
    page,
    limit,
    pagination,
    lean: true,
    populate: [{ path: 'commentsCount', match: { status: 'approved' } }, { path: 'category' }],
  };
  if (sort) {
    paginateOptions.sort = sort;
  }
  if (category) {
    try {
      const selectedCategory = await PostCategory.findOne({ url: category }).lean();
      if (!selectedCategory) {
        return res.status(404).json({ message: `Couldn't find that category` });
      }
      let childCategories = await PostCategory.find({ parentId: selectedCategory._id }).lean();
      query['postCategoryId'] = { $in: [selectedCategory._id, ...childCategories.map((child) => child._id)] };
    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: 'Database Error' });
    }
  }
  if (search) {
    query['$or'] = [
      { title: { $regex: search, $options: 'i' } },
      { content: { $regex: search, $options: 'i' } },
      { authorName: { $regex: search, $options: 'i' } },
    ];
  }
  if (type) {
    query['type'] = type;
  }
  if (authorId) {
    query['authorId'] = authorId;
  }
  query['status'] = 'published';
  console.log(paginateOptions);
  try {
    const result = await Post.paginate(query, paginateOptions);
    const stripcontent = {
      ...result,
      docs: result.docs.map((post: any) => {
        return { ...post, content: stripContent(stripTags(post.content), 200) };
      }),
    };
    res.json(stripcontent);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Database Error' });
  }
});

//Client get authorId list
PostsRouter.get('/authorIds', async (req: Request, res: Response, next: NextFunction) => {
  try {
    let authorIdList = await Post.find().distinct('authorId');
    res.json(authorIdList);
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

//Client get view
PostsRouter.get('/:url/view', async (req: any, res: Response, next: NextFunction) => {
  const url = req.params.url;
  try {
    let postData = await Post.findOne({ url, status: 'published' });
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
    res.json({ view: postData.view });
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
PostsRouter.post('/:url/comments', verifyRecaptcha, async (req: Request, res: Response, next: NextFunction) => {
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
        let isUnique = (await checkUnique(Post, req.body, 'title')) && (await checkUnique(Post, req.body, 'url'));
        if (!isUnique) {
          return res.status(400).json({ message: 'Tiêu đề và URL không được trùng lập' });
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
          if (process.env.CLIENT_URL) {
            let category = await PostCategory.findById(result.postCategoryId);
            const authorValidate = await axios.get(process.env.CLIENT_URL + `/api/revalidate/?path=/blog/author/${result.authorId}&type=layout`);
            const categoryValidate = async () => {
              category &&
                process.env.CLIENT_URL &&
                (await axios.get(process.env.CLIENT_URL + `/api/revalidate/?path=/blog/category/${category.url}&type=layout`));
            };
            const blogValidate = await axios.get(process.env.CLIENT_URL + `/api/revalidate/?path=/blog&type=page`);
            const blogPageValidate = await axios.get(process.env.CLIENT_URL + `/api/revalidate/?path=/blog/page/[page]&type=page`);
            const homeValidate = await axios.get(process.env.CLIENT_URL + `/api/revalidate/?path=/&type=page`);
            const promises = [authorValidate, categoryValidate, blogValidate, blogPageValidate];
            category?.url === 'khuyen-mai' && promises.push(homeValidate);
            result.status === 'published' && (await Promise.allSettled(promises));
          }
          return res.status(201).json(result);
        } catch (error: any) {
          console.log(error);
          return res.status(500).json({ message: error.message || 'Database Error' });
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
    if (idData) {
      if (process.env.CLIENT_URL) {
        let category = await PostCategory.findById(idData.postCategoryId);
        const authorValidate = await axios.get(process.env.CLIENT_URL + `/api/revalidate/?path=/blog/author/${idData.authorId}&type=layout`);
        const categoryValidate = async () => {
          category && process.env.CLIENT_URL && (await axios.get(process.env.CLIENT_URL + `/api/revalidate/?path=/blog/category/${category.url}&type=layout`));
        };
        const blogValidate = await axios.get(process.env.CLIENT_URL + `/api/revalidate/?path=/blog&type=page`);
        const blogPageValidate = await axios.get(process.env.CLIENT_URL + `/api/revalidate/?path=/blog/page/[page]&type=page`);
        const homeValidate = await axios.get(process.env.CLIENT_URL + `/api/revalidate/?path=/&type=page`);
        const promises = [authorValidate, categoryValidate, blogValidate, blogPageValidate];
        category?.url === 'khuyen-mai' && promises.push(homeValidate);
        idData.status === 'published' && (await Promise.allSettled(promises));
      }
      return res.json({ message: 'Post Post deleted successfully' });
    } else res.status(404).json({ message: `Couldn't find that Post Post` });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ message: error.message || 'Database Error' });
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
      let isUnique = (await checkUnique(Post, req.body, 'title', id)) && (await checkUnique(Post, req.body, 'url', id));
      if (!isUnique) {
        return res.status(400).json({ message: 'Tiêu đề và URL không được trùng lập' });
      }
      const idData = await Post.findOne({ $or: [{ _id: id }, { url: id }] });
      if (!idData) return res.status(404).json({ message: `Couldn't find that Post Post` });
      try {
        const dataInsert = { ...req.body, updatedBy: req.user?.firstName + ' ' + req.user?.lastName };
        if (req.file) {
          await cloudinary.uploader.destroy(idData.imageUrl.publicId);
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
        await idData.updateOne(dataInsert);
        if (process.env.CLIENT_URL) {
          let category = await PostCategory.findById(idData.postCategoryId);
          const authorValidate = await axios.get(process.env.CLIENT_URL + `/api/revalidate/?path=/blog/author/${idData.authorId}&type=layout`);
          const categoryValidate = async () => {
            category &&
              process.env.CLIENT_URL &&
              (await axios.get(process.env.CLIENT_URL + `/api/revalidate/?path=/blog/category/${category.url}&type=layout`));
          };
          const blogValidate = await axios.get(process.env.CLIENT_URL + `/api/revalidate/?path=/blog&type=page`);
          const blogPageValidate = await axios.get(process.env.CLIENT_URL + `/api/revalidate/?path=/blog/page/[page]&type=page`);
          const postValidate = await axios.get(process.env.CLIENT_URL + `/api/revalidate/?path=/blog/${idData.url}&type=page`);
          const homeValidate = await axios.get(process.env.CLIENT_URL + `/api/revalidate/?path=/&type=page`);
          const promises = [authorValidate, categoryValidate, blogValidate, blogPageValidate];
          category?.url === 'khuyen-mai' && promises.push(homeValidate);
          idData.status === 'published' && (await Promise.allSettled(promises));
        }
        return res.json({ message: 'Post Category updated successfully' });
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
