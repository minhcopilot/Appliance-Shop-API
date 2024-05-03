import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { Customer } from './customer.entity';
import { Employee } from './employee.entity';

@Entity({ name: 'Chats' })
export class Chat {
  @PrimaryGeneratedColumn({ name: 'Id' })
  id: number;

  @Column({ type: 'int', nullable: true })
  customerId: number;

  @Column({ type: 'int', nullable: true })
  employeeId: number;

  @Column({ name: 'IsFinished', type: 'boolean', default: false })
  isFinished: number;

  @Column({ name: 'LastUpdated', type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  lastUpdated: Date;

  @ManyToOne(() => Customer, (customer) => customer.chats)
  customer: Customer;

  @ManyToOne(() => Employee, (employee) => employee.chats)
  employee: Employee;
}
