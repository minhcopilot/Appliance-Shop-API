import express, { Request, Response } from 'express';
import { AppDataSource } from '../data-source';
import { Voucher } from '../entities/voucher.entity';
import { Order } from '../entities/order.entity';
import { Customer } from '../entities/customer.entity';
import { allowRoles } from '../middlewares/verifyRoles';
const router = express.Router();
const repository = AppDataSource.getRepository(Voucher);

/* GET vouchers */
router.get('/', async (req: Request, res: Response, next: any) => {
  try {
    const vouchers = await repository.find();
    if (vouchers.length === 0) {
      res.status(204).json({ message: 'No vouchers found' });
    } else {
      res.status(200).json(vouchers);
    }
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error', errors: error });
  }
});

/* GET voucher by id */
router.get('/:id', async (req: Request, res: Response, next: any) => {
  try {
    const voucher = await repository.findOneBy({ id: parseInt(req.params.id) });
    if (!voucher) {
      return res.status(410).json({ message: 'Not found' });
    }
    return res.status(200).json(voucher);
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error', errors: error });
  }
});

/* POST voucher */
router.post('/', async (req: Request, res: Response, next: any) => {
  try {
    const { voucherCode, description, discountPercentage, startDate, expiryDate, maxUsageCount } = req.body;

    if (!voucherCode || !description || !discountPercentage || !startDate || !expiryDate || !maxUsageCount) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    if (discountPercentage < 0 || discountPercentage > 100) {
      return res.status(400).json({ message: 'Discount percentage must be between 0 and 100' });
    }

    if (startDate > expiryDate) {
      return res.status(400).json({ message: 'Start date must be before expiry date' });
    }

    if (maxUsageCount < 0) {
      return res.status(400).json({ message: 'Max usage count must be a positive number' });
    }

    if (maxUsageCount < 0 || maxUsageCount > 100) {
      return res.status(400).json({ message: 'Max usage count must be between 0 and 100' });
    }

    const voucher = await repository.findOneBy({ voucherCode });
    if (voucher) {
      return res.status(400).json({ message: 'Voucher already exists' });
    }

    let newVoucher = new Voucher();
    newVoucher = {
      ...newVoucher,
      ...req.body,
      remainingUsageCount: maxUsageCount,
    };

    const voucherCreated = await repository.save(newVoucher);
    res.status(201).json(voucherCreated);
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ error: 'Internal server error', errors: error });
  }
});

/* PATCH voucher */
router.patch('/:id', async (req: Request, res: Response, next: any) => {
  try {
    const voucher = await repository.findOneBy({ id: parseInt(req.params.id) });
    if (!voucher) {
      return res.status(410).json({ message: 'Not found' });
    }
    const voucherUpdated = await repository.save({
      ...voucher,
      ...req.body,
    });
    res.status(200).json(voucherUpdated);
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error', errors: error });
  }
});

/* DELETE voucher */
router.delete('/:id', async (req: Request, res: Response, next: any) => {
  try {
    const voucher = await repository.findOneBy({ id: parseInt(req.params.id) });
    if (!voucher) {
      return res.status(410).json({ message: 'Not found' });
    }
    await repository.remove(voucher);
    res.status(200).json({ message: 'Voucher deleted' });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error', errors: error });
  }
});

/* apply Voucher To Order */
router.post('/apply-voucher', async (req: Request, res: Response, next: any) => {
  try {
    const { voucherCode, orderId } = req.body;
    const voucher = await repository.findOneBy({ voucherCode });
    if (!voucher) {
      return res.status(410).json({ message: 'Voucher not found' });
    }
    if (voucher.expiryDate < new Date() || voucher.remainingUsageCount <= 0) {
      return res.status(400).json({ message: 'Invalid voucher' });
    }
    const orderRepository = AppDataSource.getRepository(Order);
    const order = await orderRepository.findOneBy({ id: orderId });
    if (!order) {
      return res.status(410).json({ message: 'Order not found' });
    }
    order.voucher = voucher;
    await orderRepository.save(order);
    voucher.remainingUsageCount -= 1;
    await repository.save(voucher);
    res.status(200).json({ message: 'Voucher applied to order' });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error', errors: error });
  }
});

/* get voucher by customerId */
router.get('/customer/:customerId', async (req: Request, res: Response, next: any) => {
  try {
    const customerId = parseInt(req.params.customerId);
    const customerRepository = AppDataSource.getRepository(Customer);

    const customer = await customerRepository.findOneBy({ id: customerId });
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const vouchers = await repository.find({
      where: { customer: customer },
      relations: ['customer'],
    });

    res.status(200).json(vouchers);
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error', errors: error });
  }
});

/* POST voucher for a customer */
router.post('/customer/:customerId', async (req: Request, res: Response, next: any) => {
  try {
    const customerId = parseInt(req.params.customerId);
    const { voucherCode, description, discountPercentage, startDate, expiryDate, maxUsageCount } = req.body;

    const customerRepository = AppDataSource.getRepository(Customer);
    const customer = await customerRepository.findOneBy({ id: customerId });
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Validate voucher data
    if (!voucherCode || !description || !discountPercentage || !startDate || !expiryDate || !maxUsageCount) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    if (discountPercentage < 0 || discountPercentage > 100) {
      return res.status(400).json({ message: 'Discount percentage must be between 0 and 100' });
    }

    // Check if voucher already exists
    const existingVoucher = await repository.findOneBy({ voucherCode });
    if (existingVoucher) {
      return res.status(400).json({ message: 'Voucher already exists' });
    }

    // Create new voucher
    const newVoucher = new Voucher();
    Object.assign(newVoucher, {
      voucherCode,
      description,
      discountPercentage,
      startDate,
      expiryDate,
      maxUsageCount,
      remainingUsageCount: maxUsageCount,
      customer,
    });

    const voucherCreated = await repository.save(newVoucher);
    res.status(201).json(voucherCreated);
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error', errors: error });
  }
});
export default router;