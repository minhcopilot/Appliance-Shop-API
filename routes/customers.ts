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
      select: ['id', 'firstName', 'lastName', 'password', 'phoneNumber', 'address', 'photo', 'birthday', 'email', 'roleCode'],
    });

    if (customer.length === 0) {
      return res.status(204).json({ status: 204, message: 'No content' });
    } else {
      return res.status(200).json(customer);
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
      select: ['id', 'firstName', 'lastName', 'phoneNumber', 'address', 'photo', 'birthday', 'email', 'roleCode'],
    });
    if (!customer) {
      return res.status(410).json({ message: 'Not found' });
    }

    return res.status(200).json(customer);
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

    return res.status(200).json(tokenCustomer);
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error', errors: error });
  }
});

// PATCH customer
router.patch('/:id', allowRoles('R1', 'R3'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customer = await repository.findOneBy({ id: parseInt(req.params.id) });
    const { firstName, lastName, phoneNumber, address, birthday, email, password } = req.body;
    const formattedBirthday = format(new Date(birthday), 'yyyy-MM-dd');
    if (!customer) {
      return res.status(410).json({ message: 'Not found' });
    }
    const hash = await bcrypt.hash(password, 10);
    if (customer) {
      customer.firstName = firstName || customer.firstName;
      customer.lastName = lastName || customer.lastName;
      customer.phoneNumber = phoneNumber || customer.phoneNumber;
      customer.password = password || customer.password;
      customer.address = address || customer.address;
      customer.birthday = new Date(formattedBirthday);
      customer.email = email || customer.email;
      if (password) {
        customer.password = hash;
      }
      const updatedCustomer = await repository.save(customer);
      const { password: _, ...updatedCustomerData } = updatedCustomer || {};
      return res.status(200).json(updatedCustomerData);
    }
  } catch (error: any) {
    return res.status(500).json({ message: 'Internal server error', errors: error });
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
