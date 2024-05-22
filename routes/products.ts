import express, { Request, Response } from 'express';

import { AppDataSource } from '../data-source';
import { Product } from '../entities/product.entity';
import { allowRoles } from '../middlewares/verifyRoles';
import { uploadCloud } from '../middlewares/fileMulter';
import { fileUploadProduct, filesUploadProduct } from './fileUpload';
import cloudinary from '../utils/cloudinary';
const router = express.Router();

const repository = AppDataSource.getRepository(Product);

/* GET products */
router.get('/', async (req: Request, res: Response, next: any) => {
  try {
    const products = await repository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.supplier', 'supplier')
      .getMany();

    if (products.length === 0) {
      res.status(204).json({ message: 'No products' });
    } else {
      // Chuyển đổi chuỗi JSON thành mảng đối tượng cho từng sản phẩm
      const productsWithParsedImageUrls = products.map((product) => {
        return {
          ...product,
          imageUrls: JSON.parse(product.imageUrls),
        };
      });

      res.status(200).json(productsWithParsedImageUrls);
    }
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error', errors: error });
  }
});
/* GET products by category */
router.get('/category/:categoryId', async (req: Request, res: Response, next: any) => {
  try {
    const categoryId = parseInt(req.params.categoryId);

    const products = await repository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.supplier', 'supplier')
      .where('product.categoryId = :categoryId', { categoryId })
      .getMany();

    if (products.length === 0) {
      res.status(204).json({ message: 'No products found for this category' });
    } else {
      // Chuyển đổi chuỗi JSON thành mảng đối tượng cho từng sản phẩm
      const productsWithParsedImageUrls = products.map((product) => {
        return {
          ...product,
          imageUrls: JSON.parse(product.imageUrls),
        };
      });

      res.status(200).json(productsWithParsedImageUrls);
    }
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error', errors: error });
  }
});
/* Search products by keyword (name and description) */
router.get('/search', async (req: Request, res: Response, next: any) => {
  try {
    const { keyword } = req.query;

    const query = repository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.supplier', 'supplier')
      .where('product.name LIKE :keyword OR product.description LIKE :keyword', { keyword: `%${keyword}%` });

    const products = await query.getMany();

    if (products.length === 0) {
      return res.status(204).json({ message: 'No products found' });
    }

    // Chuyển đổi chuỗi JSON thành mảng đối tượng cho từng sản phẩm
    const productsWithParsedImageUrls = products.map((product) => {
      return {
        ...product,
        imageUrls: JSON.parse(product.imageUrls),
      };
    });

    res.status(200).json(productsWithParsedImageUrls);
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
      return res.status(404).json({ message: 'Not found' });
    }
    product.imageUrls = JSON.parse(product.imageUrls);
    res.status(200).json(product);
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error', errors: error });
  }
});

/* POST product */
router.post('/', allowRoles('R1', 'R3'), uploadCloud.array('files', 5), async (req: any, res: Response, next: any) => {
  try {
    const { name } = req.body;
    const exitsProduct = await repository.findOneBy({ name });
    if (exitsProduct) {
      return res.status(400).json({ message: 'Product already exists' });
    }
    const dataInsert = req.files.map((file: any) => ({
      url: file.path,
      publicId: file.filename,
      size: file.size,
      name: file.originalname,
    }));

    let newRecord = new Product();

    const uploadPromises = dataInsert.map((file: any) => {
      return cloudinary.uploader.upload(file.url, {
        folder: 'products',
      });
    });
    // Chờ cho tất cả upload hoàn tất
    const results = await Promise.all(uploadPromises);
    // Cập nhật thông tin trong dataInsert với kết quả từ Cloudinary
    dataInsert.forEach((file: any, index: any) => {
      file.url = results[index].secure_url;
      file.publicId = results[index].public_id;
      file.name = results[index].original_filename;
      file.size = results[index].bytes;
    });
    newRecord = {
      ...req.body,
      imageUrls: JSON.stringify(dataInsert), // Chuyển đổi mảng đối tượng thành chuỗi JSON
    };
    await repository.save(newRecord);
    res.status(201).json(newRecord);
  } catch (error: any) {
    console.log('««««« error »»»»»', error);
    res.status(500).json({ message: 'Internal server error', errors: error });
  }
});

/* PATCH product */
router.patch('/:id', allowRoles('R1', 'R3'), uploadCloud.array('files', 5), async (req: Request, res: Response, next: any) => {
  try {
    const product = await repository.findOneBy({ id: parseInt(req.params.id) });
    if (!product) {
      return res.status(404).json({ message: 'Not found' });
    }

    // Cập nhật các trường dữ liệu khác của sản phẩm
    Object.assign(product, req.body);

    // Xử lý cập nhật hình ảnh
    if (Array.isArray(req.files) && req.files.length > 0) {
      const dataInsert = req.files.map((file: any) => ({
        url: file.path,
        publicId: file.filename,
        size: file.size,
        name: file.originalname,
      }));

      const uploadPromises = dataInsert.map((file: any) => {
        return cloudinary.uploader.upload(file.url, {
          folder: 'products',
        });
      });

      // Chờ cho tất cả upload hoàn tất
      const results = await Promise.all(uploadPromises);

      // Cập nhật thông tin trong dataInsert với kết quả từ Cloudinary
      dataInsert.forEach((file: any, index: any) => {
        file.url = results[index].secure_url;
        file.publicId = results[index].public_id;
        file.name = results[index].original_filename;
        file.size = results[index].bytes;
      });

      // Ghép nối mảng ảnh mới với mảng ảnh hiện tại
      const currentImageUrls = JSON.parse(product.imageUrls);
      const newImageUrls = [...currentImageUrls, ...dataInsert];

      // Cập nhật trường imageUrls của sản phẩm
      product.imageUrls = JSON.stringify(newImageUrls);
    }

    await repository.save(product);

    const updatedProduct = await repository
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'c')
      .leftJoinAndSelect('p.supplier', 's')
      .where('p.id = :id', { id: parseInt(req.params.id) })
      .getOne();

    res.status(200).json(updatedProduct);
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error', errors: error });
  }
});

/* DELETE product */
router.delete('/:id', allowRoles('R1', 'R3'), async (req: Request, res: Response, next: any) => {
  try {
    const product = await repository.findOneBy({ id: parseInt(req.params.id) });
    if (!product) {
      return res.status(404).json({ message: 'Not found' });
    }
    await repository.delete({
      id: product.id,
    });
    res.status(200).send({ message: 'Deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error', errors: error });
  }
});

// Upload image product
router.post('/uploads/:id', async (req: Request, res: Response, next: any) => {
  const productId = req.params.id; // Lấy id sản phẩm từ URL
  try {
    await filesUploadProduct(productId, req, res); // Gọi hàm xử lý upload từ controller
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

router.post('/upload/:id', async (req: Request, res: Response, next: any) => {
  const productId = req.params.id; // Lấy id sản phẩm từ URL
  try {
    await fileUploadProduct(productId, req, res); // Gọi hàm xử lý upload từ controller
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

export default router;
