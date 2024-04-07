import express, { NextFunction, Request, Response } from 'express';
import { AppDataSource } from '../data-source';
import { allowRoles } from '../middlewares/verifyRoles';
import { Employee } from '../entities/employee.entity';

const router = express.Router();
const repository = AppDataSource.getRepository(Employee);

/* GET employees */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const employee = await repository.find();
    if (employee.length === 0) {
      res.status(204).json({ message: 'No content' });
    } else {
      return res.status(200).json({ message: 'Get all employee successfully', payload: employee });
    }
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error', errors: error });
  }
});

/* GET employee by id */
router.get('/:id', allowRoles('R1', 'R3'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const employee = await repository.findOneBy({ id: parseInt(req.params.id) });
    if (!employee) {
      return res.status(410).json({ message: 'Not found' });
    }
    return res.status(200).json({ message: 'Get detail employee successfully', payload: employee });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error', errors: error });
  }
});

// POST employee
router.post('/', allowRoles('R1', 'R3'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    const employee = await repository.findOneBy({ email });
    if (employee) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    let newCustomer = new Employee();
    newCustomer = {
      ...newCustomer,
      ...req.body,
    };

    const employeeCreated = await repository.save(newCustomer);
    return res.status(200).json({ message: 'Employee created successfully', payload: employeeCreated });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error', errors: error });
  }
});

// PATCH employee
router.patch('/:id', allowRoles('R1', 'R3'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const employee = await repository.findOneBy({ id: parseInt(req.params.id) });
    if (!employee) {
      return res.status(410).json({ message: 'Not found' });
    }
    Object.assign(employee, req.body);
    await repository.save(employee);

    const updatedCustomer = await repository.findOneBy({ id: parseInt(req.params.id) });
    return res.status(200).json({ message: 'Employee update successfully', payload: updatedCustomer });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

//Delete employee
router.delete('/:id', allowRoles('R1', 'R3'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const employee = await repository.findOneBy({ id: parseInt(req.params.id) });
    if (!employee) {
      return res.status(410).json({ message: 'Not found' });
    }
    await repository.delete({ id: parseInt(req.params.id) });
    res.status(200).json({ message: 'Employee deleted successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});
export default router;
