import { Entity, Column, OneToMany, PrimaryGeneratedColumn, BeforeInsert, BeforeUpdate } from 'typeorm';
import { Order } from './order.entity';
import * as bcrypt from 'bcrypt';
import { Chat } from './chat.entity';
const crypto = require('crypto');
@Entity({ name: 'Customers' })
export class Customer {
  // ID
  @PrimaryGeneratedColumn({ name: 'Id' })
  id: number;

  // FIRST NAME
  @Column({ name: 'FirstName', type: 'nvarchar', length: 50 })
  firstName: string;

  // LAST NAME
  @Column({ name: 'LastName', type: 'nvarchar', length: 50 })
  lastName: string;

  // PHONE NUMBER
  @Column({ name: 'PhoneNumber', length: 15, nullable: true, type: 'varchar' })
  phoneNumber: string;

  // ADDRESS
  @Column({ name: 'Address', type: 'nvarchar', nullable: true, length: 500 })
  address: string;

  @Column({ name: 'Photo', type: 'nvarchar', nullable: true, length: 500 })
  photo: string;
  // BIRTHDAY
  @Column({ name: 'Birthday', type: 'date', nullable: true })
  birthday: Date;

  // EMAIL
  @Column({ name: 'Email', unique: true, length: 50, type: 'varchar' })
  email: string;
  // Password (private to prevent accidental exposure)
  @Column({ name: 'Password', length: 255, type: 'varchar', nullable: true }) // Increase length for hashed password
  password: string;

  @Column({ name: 'passwordChangedAt', type: 'varchar', nullable: true })
  passwordChangedAt: string;

  @Column({ name: 'passwordResetToken', type: 'varchar', nullable: true })
  passwordResetToken: string;

  @Column({ name: 'passwordResetExpires', type: 'varchar', nullable: true })
  passwordResetExpires: number;

  // ORDERS
  @OneToMany(() => Order, (o) => o.customer)
  orders: Order[];

  //CHATS
  @OneToMany(() => Chat, (c) => c.customer)
  chats: Chat[];

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.password) {
      this.password = await bcrypt.hash(this.password, 10);
    }
  }
  // Validate password during login or other authentication scenarios
  async validatePassword(plainPassword: string): Promise<boolean> {
    return await bcrypt.compare(plainPassword, this.password);
  }

  createPasswordChangedToken(): string {
    const resetToken = crypto.randomBytes(32).toString('hex');
    this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    this.passwordResetExpires = Date.now() + 15 * 60 * 1000;
    return resetToken;
  }
}
