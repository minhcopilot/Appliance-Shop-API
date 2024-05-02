import { IsNotEmpty, Max, Min } from 'class-validator';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Order } from './order.entity';
import { Product } from './product.entity';

@Entity({ name: 'OrderDetails' })
export class OrderDetail {
  @PrimaryColumn({ type: 'int' })
  productId: number;

  @Column({ name: 'Quantity', type: 'int', default: 0 })
  @Min(0)
  quantity: number;

  @Column({ name: 'Price', type: 'decimal', precision: 18, scale: 2, default: 0 })
  @Min(0)
  price: number;

  @Column({ name: 'Discount', type: 'int', default: 0 })
  discount: number;
  @Min(0)
  @Max(90)
  @ManyToOne(() => Product, (p) => p.orderDetails)
  product: Product;

  @ManyToOne(() => Order, (o) => o.orderDetails)
  @JoinColumn({ name: 'orderId' }) // Liên kết orderId với order.id
  order: Order;
}
