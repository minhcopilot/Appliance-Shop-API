import express, { Request, Response } from 'express';

import { AppDataSource } from '../data-source';
import { Product } from '../entities/product.entity';
import { allowRoles } from '../middlewares/verifyRoles';

const router = express.Router();

const repository = AppDataSource.getRepository(Product);

/* GET products */
router.get('/', async (req: Request, res: Response, next: any) => {
  try {
    // SELECT * FROM [Products] AS 'product'
    const products = await repository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.supplier', 'supplier')
      .getMany();

    if (products.length === 0) {
      res.status(204).json({ message: 'No products' });
    } else {
      res.status(200).json(products);
    }
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error', errors: error });
  }
});

/* GET product by id */
router.get('/:id', async (req: Request, res: Response, next: any) => {
  try {
    // SELECT * form products where
    const product = await repository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.supplier', 'supplier')
      .where('product.id = :id', { id: parseInt(req.params.id) })
      .getOne();
    if (!product) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.status(200).json(product);
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error', errors: error });
  }
});

/* POST product */
router.post('/', allowRoles('R1', 'R3'), async (req: Request, res: Response, next: any) => {
  try {
    const { name } = req.body;
    const exitsProduct = await repository.findOneBy({ name });
    if (exitsProduct) {
      return res.status(400).json({ error: 'Product already exists' });
    }

    const product = new Product();
    Object.assign(product, req.body);
    await repository.save(product);
    res.status(201).json(product);
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error', errors: error });
  }
});

/* PATCH product */
router.patch('/:id', allowRoles('R1', 'R3'), async (req: Request, res: Response, next: any) => {
  try {
    const product = await repository.findOneBy({ id: parseInt(req.params.id) });
    if (!product) {
      return res.status(404).json({ error: 'Not found' });
    }

    Object.assign(product, req.body);

    await repository.save(product);

    const updatedCategory = await repository
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'c')
      .where('p.id = :id', { id: parseInt(req.params.id) })
      .getOne();
    res.status(200).json(updatedCategory);
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error', errors: error });
  }
});

/* DELETE product */
router.delete('/:id', allowRoles('R1', 'R3'), async (req: Request, res: Response, next: any) => {
  try {
    const product = await repository.findOneBy({ id: parseInt(req.params.id) });
    if (!product) {
      return res.status(404).json({ error: 'Not found' });
    }
    await repository.delete({
      id: product.id,
    });
    res.status(200).send({ message: 'Deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error', errors: error });
  }
});

export default router;
