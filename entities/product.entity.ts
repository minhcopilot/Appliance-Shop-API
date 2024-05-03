import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

import { Category } from './category.entity';
import { Supplier } from './supplier.entity';
import { OrderDetail } from './order-details.entity';
import { Max, Min, min } from 'class-validator';

@Entity({ name: 'Products' })
export class Product {
  @PrimaryGeneratedColumn({ name: 'Id', type: 'int' })
  id: number;

  // ----------------------------------------------------------------------------------------------
  // NAME
  // ----------------------------------------------------------------------------------------------
  @Column({ name: 'Name', type: 'nvarchar', length: 100 })
  name: string;

  // ----------------------------------------------------------------------------------------------
  // PRICE
  // ----------------------------------------------------------------------------------------------
  @Column({ name: 'Price', type: 'decimal', precision: 18, scale: 2 })
  @Min(0)
  price: number;

  // ----------------------------------------------------------------------------------------------
  // DISCOUNT
  // ----------------------------------------------------------------------------------------------
  @Column({ name: 'Discount', type: 'int', default: 0 })
  @Min(0)
  @Max(90)
  discount: number;

  // ----------------------------------------------------------------------------------------------
  // STOCK
  // ----------------------------------------------------------------------------------------------
  @Column({ name: 'Stock', type: 'int', default: 0 })
  stock: number;

  // ----------------------------------------------------------------------------------------------
  // DESCRIPTION
  // ----------------------------------------------------------------------------------------------
  // @Column({ name: 'Description', type: 'nvarchar', length: 'MAX', nullable: true })
  @Column({ name: 'Description', type: 'nvarchar', nullable: true })
  description: string;

  // ----------------------------------------------------------------------------------------------

  // IMAGE
  // ----------------------------------------------------------------------------------------------
  @Column({ type: 'text', nullable: true })
  imageUrls: string[];

  @Column({ name: 'CoverImageUrl', type: 'varchar', length: 500, nullable: true })
  coverImageUrl: string;

  // CATEGORY ID
  // ----------------------------------------------------------------------------------------------
  @Column({ type: 'int', nullable: true })
  categoryId: number;

  // ----------------------------------------------------------------------------------------------
  // SUPPLIER ID
  // ----------------------------------------------------------------------------------------------
  @Column({ type: 'int', nullable: true })
  supplierId: number;

  // ----------------------------------------------------------------------------------------------
  // RELATIONS
  // ----------------------------------------------------------------------------------------------
  @ManyToOne(() => Category, (c) => c.products)
  category: Category;

  @ManyToOne(() => Supplier, (s) => s.products)
  supplier: Supplier;

  @OneToMany(() => OrderDetail, (od) => od.product)
  orderDetails: OrderDetail[];
}
