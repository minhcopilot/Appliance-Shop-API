import express from 'express';
import { AppDataSource } from '../../data-source';
import { Role } from '../../entities/role.entity';

const router = express.Router();
const repository = AppDataSource.getRepository(Role);

router.get('/', async (req, res) => {
  try {
    const roles = await repository.find();
    if (roles.length === 0) {
      return res.status(404).json({
        message: 'No content',
      });
    } else {
      return res.status(200).json({ message: 'Get all roles successfully', data: roles });
    }
  } catch (error) {
    return res.status(500).json({ message: 'Internal server', error: error });
  }
});
router.get('/:id', async (req, res) => {
  try {
    const role = await repository.findOneBy({ id: parseInt(req.params.id) });
    if (!role) {
      return res.status(404).json({
        message: 'Not found',
      });
    } else {
      return res.status(200).json({ message: 'Get detail roles successfully', data: role });
    }
  } catch (error) {
    return res.status(500).json({ message: 'Internal server', error: error });
  }
});
router.post('/', async (req, res) => {
  try {
    const { roleCode, value } = req.body;
    const role = await repository.findOne({
      where: {
        roleCode: roleCode,
        value: value,
      },
    });
    if (role) {
      return res.status(409).json({
        message: 'Role already exists',
      });
    }
    let newRole = new Role();
    newRole = {
      ...newRole,
      ...req.body,
    };
    const roleCreated = await repository.save(newRole);
    return res.status(201).json({ message: 'Role created successfully', roleCreated: roleCreated });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server', error: error });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const role = await repository.findOneBy({ id: parseInt(req.params.id) });
    if (!role) {
      return res.status(404).json({
        message: 'Not found',
      });
    } else {
      Object.assign(role, req.body);
      await repository.save(role);

      const updatedRole = await repository.findOneBy({ id: parseInt(req.params.id) });
      return res.status(200).json({ message: 'Role updated successfully', roleUpdated: updatedRole });
    }
  } catch (error) {
    return res.status(500).json({ message: 'Internal server', error: error });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const role = await repository.findOneBy({ id: parseInt(req.params.id) });
    if (!role) {
      return res.status(404).json({
        message: 'Not found',
      });
    } else {
      await repository.remove(role);
      return res.status(200).json({ message: 'Role deleted successfully' });
    }
  } catch (error) {
    return res.status(500).json({ message: 'Internal server', error: error });
  }
});
export default router;
