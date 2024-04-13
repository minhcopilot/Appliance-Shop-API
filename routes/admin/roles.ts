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
      const payload = {
        message: 'Get all roles successfully',
        data: { roles },
      };
      return res.status(200).json({ status: 200, payload: payload });
    }
  } catch (error: any) {
    return res.status(500).json({ message: 'Internal server', errors: error });
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
      const payload = {
        message: 'Get detail roles successfully',
        data: { role },
      };
      return res.status(200).json({ status: 200, payload: payload });
    }
  } catch (error: any) {
    return res.status(500).json({ message: 'Internal server', errors: error });
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
    const payload = {
      message: 'Create role successfully',
      data: { roleCreated },
    };
    return res.status(201).json({ status: 200, payload: payload });
  } catch (error: any) {
    return res.status(500).json({ message: 'Internal server', errors: error });
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
      const payload = {
        message: 'Update role successfully',
        data: { updatedRole },
      };
      return res.status(200).json({ status: 200, payload: payload });
    }
  } catch (error: any) {
    return res.status(500).json({ message: 'Internal server', errors: error });
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
      return res.status(200).json({ status: 200, payload: { message: 'Delete role successfully' } });
    }
  } catch (error: any) {
    return res.status(500).json({ message: 'Internal server', errors: error });
  }
});
export default router;
