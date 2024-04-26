import express, { Express, NextFunction, Request, Response } from 'express';

import { AppDataSource } from '../data-source';
import { OrderDetail } from '../entities/order-details.entity';
import { Order } from '../entities/order.entity';
import { Customer } from '../entities/customer.entity';
import { allowRoles } from '../middlewares/verifyRoles';

const router = express.Router();
const customerRepository = AppDataSource.getRepository(Customer);
const orderRepository = AppDataSource.getRepository(Order);
const orderDetailRepository = AppDataSource.getRepository(OrderDetail);
/* GET orders */
router.get('/', async (req: Request, res: Response, next: any) => {
  try {
    // SELECT * FROM [Products] AS 'product'
    const orders = await orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.customer', 'customer')
      .leftJoinAndSelect('order.employee', 'employee')
      .leftJoinAndSelect('order.orderDetails', 'orderDetails')
      .leftJoinAndSelect('orderDetails.product', 'product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.supplier', 'supplier')
      .select([
        'order.id',
        'order.createdDate',
        'order.shippedDate',
        'order.shippingAddress',
        'order.shippingCity',
        'order.paymentType',
        'order.status',
        'order.description',
        'order.customerId',
        'order.employeeId',
        'customer',
        'employee',
        'orderDetails.quantity',
        'orderDetails.price',
        'orderDetails.discount',
        'product',
        'category',
        'supplier',
      ])
      .getMany();

    if (orders.length === 0) {
      res.sendStatus(204);
    } else {
      res.status(200).json(orders);
    }
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error', errors: error });
  }
});

router.get('/:id', async (req: Request, res: Response, next: any) => {
  try {
    // SELECT * FROM [Products] AS 'product'
    const order = await orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.customer', 'customer')
      .leftJoinAndSelect('order.employee', 'employee')
      .leftJoinAndSelect('order.orderDetails', 'orderDetails')
      .leftJoinAndSelect('orderDetails.product', 'product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.supplier', 'supplier')
      .where('order.id = :id', { id: req.params.id })
      .select([
        'order.id',
        'order.createdDate',
        'order.shippedDate',
        'order.shippingAddress',
        'order.shippingCity',
        'order.paymentType',
        'order.status',
        'order.description',
        'order.customerId',
        'order.employeeId',
        'customer',
        'employee',
        'orderDetails.quantity',
        'orderDetails.price',
        'orderDetails.discount',
        'product',
        'category',
        'supplier',
      ])
      .getOne();

    if (order) {
      res.json(order);
    } else {
      res.sendStatus(204);
    }
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error', errors: error });
  }
});

router.post('/', async (req: Request, res: Response) => {
  const { shippedDate, status, description, shippingAddress, shippingCity, paymentType, customerId, employeeId, orderDetails } = req.body;

  try {
    const newOrder = orderRepository.create({
      shippedDate,
      status,
      description,
      shippingAddress,
      shippingCity,
      paymentType,
      customerId,
      employeeId,
    });

    const savedOrder = await orderRepository.save(newOrder);

    if (orderDetails && orderDetails.length > 0) {
      const orderDetailEntities = orderDetails.map((od: any) => {
        return orderDetailRepository.create({
          ...od,
          order: savedOrder,
        });
      });

      const savedOrderDetails = await orderDetailRepository.save(orderDetailEntities);
      savedOrder.orderDetails = savedOrderDetails;
    }

    res.status(201).json(savedOrder);
  } catch (error) {
    res.status(500).json({ error: 'Đã xảy ra lỗi khi tạo đơn hàng mới.' });
  }
});

// GET /orders/user/:userId
router.get('/user/:userId', async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId, 10);

  try {
    // Kiểm tra xem userId có tồn tại trong bảng Customer không
    const customer = await customerRepository.findOne({ where: { id: userId } });
    if (!customer) {
      return res.status(404).json({ error: 'Không tìm thấy khách hàng.' });
    }

    // Lấy danh sách đơn hàng của khách hàng
    const orders = await orderRepository.find({
      where: { customer },
      relations: ['orderDetails', 'orderDetails.product'],
    });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Đã xảy ra lỗi khi lấy danh sách đơn hàng.' });
  }
});
// update status
router.patch('/:orderId', async (req: Request, res: Response) => {
  const orderId = parseInt(req.params.orderId, 10);
  const { status } = req.body;

  try {
    // Tìm đơn hàng theo orderId
    const order = await orderRepository.findOneBy({ id: orderId });
    if (!order) {
      return res.status(404).json({ error: 'Không tìm thấy đơn hàng.' });
    }

    // Cập nhật trạng thái đơn hàng
    order.status = status;
    const updatedOrder = await orderRepository.save(order);

    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ error: 'Đã xảy ra lỗi khi cập nhật trạng thái đơn hàng.' });
  }
});

// DELETE /orders/:orderId
router.delete('/:orderId', async (req: Request, res: Response) => {
  const orderId = parseInt(req.params.orderId, 10);

  try {
    // Tìm đơn hàng theo orderId
    const order = await orderRepository.findOneBy({ id: orderId });
    if (!order) {
      return res.status(404).json({ error: 'Không tìm thấy đơn hàng.' });
    }

    // Xóa đơn hàng
    await orderRepository.remove(order);

    res.json({ message: 'Đơn hàng đã được xóa thành công.' });
  } catch (error) {
    res.status(500).json({ error: 'Đã xảy ra lỗi khi xóa đơn hàng.' });
  }
});
export default router;
