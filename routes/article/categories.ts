import express, { NextFunction, Request, Response } from 'express';
import { PostCategory, postCategorySchema } from '../../entities/post-category.model';
import { checkUnique } from '../../utils/checkUnique';
import { validateSchema, validateSchemaByField } from '../../utils/validateSchema';
import { urlGenerate } from '../../utils/urlGenerate';
import { allowRoles } from '../../middlewares/verifyRoles';
import passport from 'passport';
import { uploadCloud } from '../../middlewares/fileMulter';
import cloudinary from '../../utils/cloudinary';
const { passportConfigAdmin } = require('../../middlewares/passportAdmin');
export const PostCategoriesRouter = express.Router();

passport.use('admin', passportConfigAdmin);

//Client get all post categories
PostCategoriesRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await PostCategory.find({ isDeleted: false }).lean({ virtuals: true }).populate(['postCount', 'parentCategory']));
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Database Error' });
  }
});

//Admin get all post categories
PostCategoriesRouter.get(
  '/all',
  passport.authenticate('admin', { session: false }),
  allowRoles('R1', 'R3'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await PostCategory.find().lean({ virtuals: true }).populate(['postCount', 'parentCategory']));
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: 'Database Error' });
    }
  },
);

//Client get post category by url
PostCategoriesRouter.get('/:url', async (req: Request, res: Response, next: NextFunction) => {
  const url = req.params.url;
  try {
    let categoryData = await PostCategory.findOne({ url, isDeleted: false }).lean({ virtuals: true }).populate(['postCount', 'parentCategory']);
    categoryData ? res.json(categoryData) : res.status(404).json({ message: `Couldn't find that category` });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ message: 'Database Error' });
  }
});

//Admin get post category by url
PostCategoriesRouter.get(
  '/all/:url',
  passport.authenticate('admin', { session: false }),
  allowRoles('R1', 'R3'),
  async (req: Request, res: Response, next: NextFunction) => {
    const url = req.params.url;
    try {
      let categoryData = await PostCategory.findOne({ url }).lean({ virtuals: true }).populate(['postCount', 'parentCategory']);
      categoryData ? res.json(categoryData) : res.status(404).json({ message: `Couldn't find that category` });
    } catch (error: any) {
      console.log(error);
      res.status(500).json({ message: 'Database Error' });
    }
  },
);

//Admin check unique, return array of not unique fields
PostCategoriesRouter.post('/check-unique/', async (req, res) => {
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

PostCategoriesRouter.post('/check-unique/:id', async (req, res) => {
  const body = req.body;
  const id = req.params.id;
  let uniqueError = [];
  for (const key in body) {
    if (key in postCategorySchema.fields) {
      try {
        let isUnique = await checkUnique(PostCategory, body, key, id);
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
PostCategoriesRouter.post(
  '/all',
  passport.authenticate('admin', { session: false }),
  allowRoles('R1', 'R3'),
  uploadCloud.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await validateSchema(postCategorySchema, req.body);
      try {
        let isUnique = await checkUnique(PostCategory, req.body, 'title');
        if (!isUnique) {
          return res.status(400).json({ message: 'title must be unique' });
        }
        const dataInsert = req.body;
        if (req.file) {
          const result = await cloudinary.uploader.upload(req.file.path, {
            folder: 'categories',
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
        const newItem = new PostCategory(dataInsert);
        try {
          let result = await newItem.save();
          // if (file) {
          //   let found = await fileUpload(result._id, req, res, PostCategory);
          // }
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

//Admin delete post category by id
PostCategoriesRouter.delete('/all/:id', passport.authenticate('admin', { session: false }), allowRoles('R1', 'R3'), async (req: Request, res: Response) => {
  const id = req.params.id;
  try {
    let idData = await PostCategory.findByIdAndDelete(id);
    idData ? res.json({ message: 'Post Category deleted successfully' }) : res.status(404).json({ message: `Couldn't find that Post Category` });
  } catch (error) {
    res.status(500).json({ message: 'Database Error' });
  }
});

//Admin update post category by id
PostCategoriesRouter.patch('/all/:id', passport.authenticate('admin', { session: false }), allowRoles('R1', 'R3'), async (req, res) => {
  const id = req.params.id;
  let inputError = [];
  for (const key in req.body) {
    if (key in postCategorySchema.fields) {
      try {
        await validateSchemaByField(postCategorySchema, req.body, key);
      } catch (error: any) {
        inputError.push(error.errors);
      }
    }
  }
  if (inputError.length > 0) {
    return res.status(400).json({ message: inputError.toString() });
  }
  try {
    let isUnique = await checkUnique(PostCategory, req.body, 'title', id);
    if (!isUnique) {
      return res.status(400).json({ message: 'title must be unique' });
    }
    try {
      const dataInsert = req.body;
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
      let idData = await PostCategory.findByIdAndUpdate(id, dataInsert);
      if (idData) {
        return res.json({ message: `Post Category updated successfully` });
      } else res.status(404).json({ message: `Couldn't find that Post Category` });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: 'Database Error' });
    }
  } catch (error) {
    console.log(error);
    return res.sendStatus(500);
  }
});
