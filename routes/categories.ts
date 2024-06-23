import express, { NextFunction, Request, Response } from 'express';

import { AppDataSource } from '../data-source';
import { Category } from '../entities/category.entity';

import { allowRoles } from '../middlewares/verifyRoles';
import { passportVerifyToken } from '../middlewares/passport';
import passport from 'passport';
import axios from 'axios';
import { Product } from '../entities/product.entity';
passport.use('jwt', passportVerifyToken);

const router = express.Router();
const repository = AppDataSource.getRepository(Category);
const productRepository = AppDataSource.getRepository(Product);

/* GET categories */
router.get('/', async (req: any, res: any, next: any) => {
  try {
    const categories = await repository.find();
    if (categories.length === 0) {
      res.status(204).json({ message: 'No categories found' });
    } else {
      res.status(200).json(categories);
    }
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error', errors: error });
  }
});

/* GET category by id */
router.get('/:id', async (req: Request, res: Response, next: any) => {
  try {
    const category = await repository.findOneBy({ id: parseInt(req.params.id) });
    if (!category) {
      return res.status(410).json({ message: 'Not found' });
    }
    return res.status(200).json(category);
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error', errors: error });
  }
});

/* POST category */
router.post('/', passport.authenticate('jwt', { session: false }), allowRoles('R1', 'R3'), async (req: Request, res: Response, next: any) => {
  try {
    const { name } = req.body;
    const category = await repository.findOneBy({ name });
    if (category) {
      return res.status(400).json({ message: 'Category already exists' });
    }
    let newCategory = new Category();

    newCategory = {
      ...newCategory,
      ...req.body,
    };

    const categoryCreated = await repository.save(newCategory);
    if (process.env.CLIENT_URL) {
      const productsPageValidate = await axios.get(process.env.CLIENT_URL + `/api/revalidate/?path=/products&type=page`);
      const homeValidate = await axios.get(process.env.CLIENT_URL + `/api/revalidate/?path=/&type=page`);
      await Promise.allSettled([productsPageValidate, homeValidate]);
    }
    res.status(201).json(categoryCreated);
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error', errors: error });
  }
});

/* PATCH category */
router.patch('/:id', passport.authenticate('jwt', { session: false }), allowRoles('R1', 'R3'), async (req: Request, res: Response, next: any) => {
  try {
    const category = await repository.findOneBy({ id: parseInt(req.params.id) });
    if (!category) {
      return res.status(404).json({ message: 'Not found' });
    }

    Object.assign(category, req.body);
    await repository.save(category);

    const updatedCategory = await repository.findOneBy({ id: parseInt(req.params.id) });
    if (process.env.CLIENT_URL) {
      let postList = await productRepository.find({ where: { categoryId: category.id } });
      const productValidate = postList.map(async (item) => {
        await axios.get(process.env.CLIENT_URL + `/api/revalidate/?path=/products/${item.id}&type=page`);
      });
      const productsPageValidate = await axios.get(process.env.CLIENT_URL + `/api/revalidate/?path=/products&type=page`);
      const homeValidate = await axios.get(process.env.CLIENT_URL + `/api/revalidate/?path=/&type=page`);
      await Promise.allSettled([productsPageValidate, homeValidate, ...productValidate]);
    }
    return res.status(200).json(updatedCategory);
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error', errors: error });
  }
});

/* DELETE category */
router.delete('/:id', passport.authenticate('jwt', { session: false }), allowRoles('R1', 'R3'), async (req: Request, res: Response, next: any) => {
  try {
    const category = await repository.findOneBy({ id: parseInt(req.params.id) });
    if (!category) {
      return res.status(404).json({ message: 'Not found' });
    }
    await repository.delete({ id: category.id });
    if (process.env.CLIENT_URL) {
      const productsPageValidate = await axios.get(process.env.CLIENT_URL + `/api/revalidate/?path=/products&type=page`);
      const homeValidate = await axios.get(process.env.CLIENT_URL + `/api/revalidate/?path=/&type=page`);
      await Promise.allSettled([productsPageValidate, homeValidate]);
    }
    res.status(200).json({ message: 'Category deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error', errors: error });
  }
});

export default router;
