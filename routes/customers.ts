import express, { NextFunction, Request, Response } from 'express';
import { AppDataSource } from '../data-source';
import { Customer } from '../entities/customer.entity';

const router = express.Router();
const repository = AppDataSource.getRepository(Customer);

/* GET customers */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customers = await repository.find();
    if (customers.length === 0) {
      res.status(204).json({ error: 'No content' });
    } else {
      res.json(customers);
    }
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/* GET customer by id */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customer = await repository.findOneBy({ id: parseInt(req.params.id) });
    if (!customer) {
      return res.status(410).json({ error: 'Not found' });
    }
    res.json(customer);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST customer
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    let customer = new Customer();
    customer = {
      ...customer,
      ...req.body,
    };

    await repository.save(customer);
    res.status(201).json(customer);
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error', error: error });
  }
});

// PATCH customer
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customer = await repository.findOneBy({ id: parseInt(req.params.id) });
    if (!customer) {
      return res.status(410).json({ error: 'Not found' });
    }
    Object.assign(customer, req.body);
    await repository.save(customer);

    const updatedCustomer = await repository.findOneBy({ id: parseInt(req.params.id) });
    res.json(updatedCustomer);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

//Delete customer
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customer = await repository.findOneBy({ id: parseInt(req.params.id) });
    if (!customer) {
      return res.status(410).json({ error: 'Not found' });
    }
    await repository.delete({ id: parseInt(req.params.id) });
    res.status(200).json({ message: 'Customer deleted' });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});
export default router;
