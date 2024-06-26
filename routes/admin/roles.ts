import express from 'express';
import { AppDataSource } from '../../data-source';
import { Role } from '../../entities/role.entity';
import { allowRoles } from '../../middlewares/verifyRoles';
import { passportVerifyToken } from '../../middlewares/passport';
import passport from 'passport';
passport.use('jwt', passportVerifyToken);
const router = express.Router();
const repository = AppDataSource.getRepository(Role);

router.get('/', passport.authenticate('jwt', { session: false }), allowRoles('R1'), async (req, res) => {
  try {
    const roles = await repository.find();
    if (roles.length === 0) {
      return res.status(404).json({
        message: 'No content',
      });
    } else {
      return res.status(200).json(roles);
    }
  } catch (error: any) {
    return res.status(500).json({ message: 'Internal server', errors: error });
  }
});
router.get('/:id', passport.authenticate('jwt', { session: false }), allowRoles('R1'), async (req, res) => {
  try {
    const role = await repository.findOneBy({ id: parseInt(req.params.id) });
    if (!role) {
      return res.status(404).json({
        message: 'Not found',
      });
    } else {
      return res.status(200).json(role);
    }
  } catch (error: any) {
    return res.status(500).json({ message: 'Internal server', errors: error });
  }
});
router.post('/', passport.authenticate('jwt', { session: false }), allowRoles('R1'), async (req, res) => {
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

    return res.status(201).json(roleCreated);
  } catch (error: any) {
    return res.status(500).json({ message: 'Internal server', errors: error });
  }
});

router.patch('/:id', passport.authenticate('jwt', { session: false }), allowRoles('R1'), async (req, res) => {
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

      return res.status(200).json(updatedRole);
    }
  } catch (error: any) {
    return res.status(500).json({ message: 'Internal server', errors: error });
  }
});

router.delete('/:id', passport.authenticate('jwt', { session: false }), allowRoles('R1'), async (req, res) => {
  try {
    const role = await repository.findOneBy({ id: parseInt(req.params.id) });
    if (!role) {
      return res.status(404).json({
        message: 'Not found',
      });
    } else {
      await repository.remove(role);
      return res.status(200).json(role);
    }
  } catch (error: any) {
    return res.status(500).json({ message: 'Internal server', errors: error });
  }
});
export default router;
