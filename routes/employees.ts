import express, { NextFunction, Request, Response } from 'express';
import { AppDataSource } from '../data-source';
import { Employee } from '../entities/employee.entity';

const router = express.Router();
const repository = AppDataSource.getRepository(Employee);

/* GET employees */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const employees = await repository.find();
    if (employees.length === 0) {
      res.status(204).json({ error: 'No content' });
    } else {
      res.json(employees);
    }
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/* GET employee by id */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const employee = await repository.findOneBy({ id: parseInt(req.params.id) });
    if (!employee) {
      return res.status(410).json({ error: 'Not found' });
    }
    res.json(employee);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST employee
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    let employee = new Employee();
    employee = {
      ...employee,
      ...req.body,
    };

    await repository.save(employee);
    res.status(201).json(employee);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH employee
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const employee = await repository.findOneBy({ id: parseInt(req.params.id) });
    if (!employee) {
      return res.status(410).json({ error: 'Not found' });
    }
    Object.assign(employee, req.body);
    await repository.save(employee);

    const updatedCustomer = await repository.findOneBy({ id: parseInt(req.params.id) });
    res.json(updatedCustomer);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

//Delete employee
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const employee = await repository.findOneBy({ id: parseInt(req.params.id) });
    if (!employee) {
      return res.status(410).json({ error: 'Not found' });
    }
    await repository.delete({ id: parseInt(req.params.id) });
    res.status(200).json({ message: 'Employee deleted' });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});
export default router;
