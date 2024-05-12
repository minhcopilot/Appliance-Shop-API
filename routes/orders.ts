import express, { Express, NextFunction, Request, Response } from 'express';

import { AppDataSource } from '../data-source';
import { OrderDetail } from '../entities/order-details.entity';
import { Order } from '../entities/order.entity';
import { Customer } from '../entities/customer.entity';
import { Product } from '../entities/product.entity';
import { allowRoles } from '../middlewares/verifyRoles';
import passport from 'passport';
import { passportSocketVerifyToken } from '../middlewares/passportSocket';
const { passportConfigAdmin } = require('../middlewares/passportAdmin');

const AnonymousStrategy = require('passport-anonymous').Strategy;

const router = express.Router();
const productRepository = AppDataSource.getRepository(Product);
const customerRepository = AppDataSource.getRepository(Customer);
const orderRepository = AppDataSource.getRepository(Order);
const orderDetailRepository = AppDataSource.getRepository(OrderDetail);
passport.use('jwt', passportSocketVerifyToken);
passport.use('admin', passportConfigAdmin);
passport.use(new AnonymousStrategy());

/* GET orders */
router.get('/', passport.authenticate('admin', { session: false }), async (req: Request, res: Response, next: any) => {
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
    res.status(500).json({ message: 'Internal server error', errors: error });
  }
});

router.get('/:id', passport.authenticate('jwt', { session: false }), async (req: any, res: Response, next: any) => {
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

    if (order?.customerId !== req.user.id && req.user.roles !== ('R3' || 'R1')) {
      return res.status(403).json({ message: 'You do not have permission to access this resource' });
    }

    if (order) {
      res.status(200).json(order);
    } else {
      res.sendStatus(204);
    }
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error', errors: error });
  }
});

router.post('/', passport.authenticate(['jwt', 'anonymous'], { session: false }), async (req: any, res: Response) => {
  const {
    firstName,
    lastName,
    phoneNumber,
    email,
    shippedDate,
    status,
    description,
    shippingAddress,
    shippingCity,
    paymentType,
    customerId,
    employeeId,
    orderDetails,
  } = req.body;

  let order = {
    shippedDate,
    status,
    description,
    shippingAddress,
    shippingCity,
    paymentType,
    customerId,
    employeeId,
  };
  if (req.user?.roles === ('R3' || 'R1')) {
    order.employeeId = req.user.id;
  } else {
    order.customerId = req.user.id;
  }
  try {
    orderDetails &&
      orderDetails.forEach(async (od: any) => {
        try {
          let product = await productRepository.findOne({ where: { id: od.productId } });
          if (!product) {
            return res.status(400).json({ message: 'Sản phẩm không tồn tại' });
          }
          if (product?.stock < od.quantity) {
            return res.status(400).json({ message: 'Số lượng sản phẩm không đủ' });
          }
          product.stock -= od.quantity;
          await productRepository.save(product);
        } catch (error) {
          return res.status(500).json({ message: 'Database Error' });
        }
      });

    if (!order.customerId) {
      if (!phoneNumber || !email || !firstName) {
        return res.status(400).json({ message: 'Vui lòng cung cấp thông tin khách hàng' });
      }
      const customer = await customerRepository.findOne({ where: { email } });
      if (customer) {
        if (customer.password) return res.status(400).json({ message: 'Email đã tồn tại, vui lòng dùng email khác hoặc đăng nhập để mua hàng' });
        order.customerId = customer.id;
      } else {
        const newCustomer = await customerRepository.save({ phoneNumber, email, firstName, lastName });
        order.customerId = newCustomer.id;
      }
    }
    const newOrder = orderRepository.create(order);
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
    console.log('««««« error »»»»»', error);
    res.status(500).json({ message: 'Đã xảy ra lỗi khi tạo đơn hàng mới.' });
  }
});

// GET /orders/user/:userId
router.get('/user/:userId', passport.authenticate('jwt', { session: false }), async (req: any, res: Response) => {
  const userId = parseInt(req.params.userId, 10);
  if (userId !== req.user.id && req.user.roles !== ('R3' || 'R1')) {
    return res.status(403).json({ message: 'You do not have permission to access this resource' });
  }
  try {
    // Kiểm tra xem userId có tồn tại trong bảng Customer không
    const customer = await customerRepository.findOne({ where: { id: userId } });
    if (!customer) {
      return res.status(404).json({ message: 'Không tìm thấy khách hàng.' });
    }

    // Lấy danh sách đơn hàng của khách hàng
    const orders = await orderRepository.find({
      where: { customer },
      relations: ['orderDetails', 'orderDetails.product'],
    });

    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Đã xảy ra lỗi khi lấy danh sách đơn hàng.' });
  }
});
// update status
router.patch('/:orderId', async (req: Request, res: Response) => {
  const orderId = parseInt(req.params.orderId, 10);
  const { shippedDate, status, description, shippingAddress, shippingCity, paymentType, customerId, employeeId, orderDetails } = req.body;

  try {
    // Tìm đơn hàng theo orderId
    const order = await orderRepository.findOneBy({ id: orderId });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Cập nhật các trường của đơn hàng
    order.shippedDate = shippedDate;
    order.status = status;
    order.description = description;
    order.shippingAddress = shippingAddress;
    order.shippingCity = shippingCity;
    order.paymentType = paymentType;
    order.customerId = customerId;
    order.employeeId = employeeId;

    order.orderDetails = [];
    // Nếu không có orderDetails mới được gửi lên, giữ nguyên orderDetails hiện tại
    if (!orderDetails || orderDetails.length === 0) {
      order.orderDetails = [];
      order.orderDetails = await orderDetailRepository.save(order.orderDetails);
    } else {
      // Xóa tất cả chi tiết đơn hàng hiện có
      order.orderDetails = [];
      // Thêm các chi tiết đơn hàng mới
      const newOrderDetails = orderDetails.map((od: any) => {
        const newOrderDetail = orderDetailRepository.create({
          productId: od.productId,
          quantity: od.quantity,
          price: od.price,
          discount: od.discount,
        });
        return newOrderDetail;
      });
      order.orderDetails = await orderDetailRepository.save(newOrderDetails);
    }

    // Lưu đơn hàng đã cập nhật
    const updatedOrder = await orderRepository.save(order);
    res.status(200).json(updatedOrder);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update order' });
  }
});
// DELETE /orders/:orderId
router.delete('/:orderId', async (req: Request, res: Response) => {
  const orderId = parseInt(req.params.orderId, 10);

  try {
    // Tìm đơn hàng theo orderId
    const order = await orderRepository.findOneBy({ id: orderId });
    if (!order) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
    }

    // Xóa đơn hàng
    await orderRepository.remove(order);

    res.status(200).json({ message: 'Đơn hàng đã được xóa thành công.' });
  } catch (error) {
    res.status(500).json({ message: 'Đã xảy ra lỗi khi xóa đơn hàng.' });
  }
});
export default router;
