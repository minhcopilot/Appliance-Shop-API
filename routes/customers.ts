import express, { NextFunction, Request, Response } from 'express';
import { AppDataSource } from '../data-source';
import { allowRoles } from '../middlewares/verifyRoles';
import { Customer } from '../entities/customer.entity';
import * as bcrypt from 'bcrypt';
import { format } from 'date-fns';
const router = express.Router();
const repository = AppDataSource.getRepository(Customer);

/* GET customers */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customer = await repository.find({
      select: [
        'id',
        'firstName',
        'lastName',
        'phoneNumber',
        'address',
        'photo',
        'birthday',
        'email',
        'passwordChangedAt',
        'passwordResetToken',
        'passwordResetExpires',
        'roleCode',
      ],
    });

    if (customer.length === 0) {
      res.status(204).json({ message: 'No content' });
    } else {
      const payload = {
        message: 'Get all customer successfully',
        data: { customer },
      };
      return res.status(200).json({ status: 200, payload: payload });
    }
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error', errors: error });
  }
});

/* GET customer by id */
router.get('/:id', allowRoles('R1', 'R3'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customer = await repository.findOne({
      where: { id: parseInt(req.params.id) },
      select: [
        'id',
        'firstName',
        'lastName',
        'phoneNumber',
        'address',
        'photo',
        'birthday',
        'email',
        'passwordChangedAt',
        'passwordResetToken',
        'passwordResetExpires',
        'roleCode',
      ],
    });

    if (!customer) {
      return res.status(410).json({ message: 'Not found' });
    }

    const payload = {
      message: 'Get detail customer successfully',
      data: { customer },
    };
    return res.status(200).json({ status: 200, payload: payload });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error', errors: error });
  }
});

// POST customer
router.post('/', allowRoles('R1', 'R3'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { firstName, lastName, phoneNumber, address, birthday, email, password } = req.body;
    const formattedBirthday = format(new Date(birthday), 'yyyy-MM-dd');
    const customer = await repository.findOneBy({ email: email });
    if (customer) {
      return res.status(400).json({ message: 'Account already exists' });
    }
    const hash = await bcrypt.hash(password, 10);

    const newCustomer = {
      firstName: firstName,
      lastName: lastName,
      phoneNumber: phoneNumber,
      address: address,
      birthday: formattedBirthday,
      email: email,
      password: hash,
    };

    await repository.save(newCustomer);

    const user: any = await repository.findOneBy({ email: email });
    const { password: _, ...tokenCustomer } = user;

    const payload = {
      message: 'Register successfully',
      data: { customer: tokenCustomer },
    };
    return res.status(200).json({ status: 200, payload: payload });
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
    const { password, ...updatedCustomerData } = updatedCustomer || {};
    const payload = {
      message: 'Customer updated successfully',
      data: { customer: updatedCustomerData },
    };

    return res.status(200).json({ status: 200, payload: payload });
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
    res.status(200).json({ status: 200, payload: { message: 'Customer deleted successfully' } });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});
export default router;
