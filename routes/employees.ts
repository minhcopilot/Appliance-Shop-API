import express, { NextFunction, Request, Response } from 'express';
import { AppDataSource } from '../data-source';
import { allowRoles } from '../middlewares/verifyRoles';
import { Employee } from '../entities/employee.entity';
import * as bcrypt from 'bcrypt';
import { format } from 'date-fns';
const router = express.Router();
const repository = AppDataSource.getRepository(Employee);

/* GET employees */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const employee = await repository.find({
      select: ['id', 'firstName', 'lastName', 'phoneNumber', 'address', 'photo', 'birthday', 'email', 'roleCode'],
    });

    if (employee.length === 0) {
      return res.status(204).json({ status: 204, message: 'No content' });
    } else {
      const payload = {
        message: 'Get all employee successfully',
        data: { employee },
      };
      return res.status(200).json({ status: 200, payload: payload });
    }
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error', errors: error });
  }
});

/* GET employee by id */
router.get('/:id', allowRoles('R1', 'R3'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const employee = await repository.findOne({
      where: { id: parseInt(req.params.id) },
      select: ['id', 'firstName', 'lastName', 'phoneNumber', 'address', 'photo', 'birthday', 'email', 'roleCode'],
    });
    if (!employee) {
      return res.status(410).json({ message: 'Not found' });
    }
    const payload = {
      message: 'Get detail employee successfully',
      data: { employee },
    };
    return res.status(200).json({ status: 200, payload: payload });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error', errors: error });
  }
});

// POST employee
router.post('/', allowRoles('R1', 'R3'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { firstName, lastName, phoneNumber, address, birthday, email, password } = req.body;
    const formattedBirthday = format(new Date(birthday), 'yyyy-MM-dd');
    const employee = await repository.findOneBy({ email: email });
    if (employee) {
      return res.status(400).json({ message: 'Account already exists' });
    }
    const hash = await bcrypt.hash(password, 10);

    const newEmployee = {
      firstName: firstName,
      lastName: lastName,
      phoneNumber: phoneNumber,
      address: address,
      birthday: formattedBirthday,
      email: email,
      password: hash,
    };

    await repository.save(newEmployee);

    const user: any = await repository.findOneBy({ email: email });
    const { password: _, ...tokenEmployee } = user;

    const payload = {
      message: 'Register successfully',
      data: { customer: tokenEmployee },
    };
    return res.status(200).json({ status: 200, payload: payload });
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

    const updatedEmployee = await repository.findOneBy({ id: parseInt(req.params.id) });
    const { password, ...updatedEmployeeData } = updatedEmployee || {};
    const payload = {
      message: 'Employee updated successfully',
      data: { employee: updatedEmployeeData },
    };

    return res.status(200).json({ status: 200, payload: payload });
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
    res.status(200).json({ status: 200, payload: { message: 'Employee deleted successfully' } });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});
export default router;
