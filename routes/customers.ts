import express, { NextFunction, Request, Response } from 'express';
import { AppDataSource } from '../data-source';
import { allowRoles } from '../middlewares/verifyRoles';
import { Customer } from '../entities/customer.entity';

const router = express.Router();
const repository = AppDataSource.getRepository(Customer);

/* GET customers */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customer = await repository.find();
    if (customer.length === 0) {
      res.status(204).json({ message: 'No content' });
    } else {
      return res.status(200).json({ message: 'Get all customer successfully', payload: customer });
    }
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error', errors: error });
  }
});

/* GET customer by id */
router.get('/:id', allowRoles('R1', 'R3'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customer = await repository.findOneBy({ id: parseInt(req.params.id) });
    if (!customer) {
      return res.status(410).json({ message: 'Not found' });
    }
    return res.status(200).json({ message: 'Get detail customer successfully', payload: customer });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error', errors: error });
  }
});

// POST customer
router.post('/', allowRoles('R1', 'R3'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    const customer = await repository.findOneBy({ email });
    if (customer) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    let newCustomer = new Customer();
    newCustomer = {
      ...newCustomer,
      ...req.body,
    };

    const customerCreated = await repository.save(newCustomer);
    return res.status(200).json({ message: 'Customer created successfully', payload: customerCreated });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error', errors: error });
  }
});

// PATCH customer
router.patch('/:id', allowRoles('R1', 'R3'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customer = await repository.findOneBy({ id: parseInt(req.params.id) });
    if (!customer) {
      return res.status(410).json({ message: 'Not found' });
    }
    Object.assign(customer, req.body);
    await repository.save(customer);

    const updatedCustomer = await repository.findOneBy({ id: parseInt(req.params.id) });
    return res.status(200).json({ message: 'Customer update successfully', payload: updatedCustomer });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

//Delete customer
router.delete('/:id', allowRoles('R1', 'R3'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customer = await repository.findOneBy({ id: parseInt(req.params.id) });
    if (!customer) {
      return res.status(410).json({ message: 'Not found' });
    }
    await repository.delete({ id: parseInt(req.params.id) });
    res.status(200).json({ message: 'Customer deleted successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});
export default router;
