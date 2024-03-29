import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { Customer } from './customer.entity';
import { Employee } from './employee.entity';

@Entity({ name: 'Chats' })
export class Chat {
  @PrimaryGeneratedColumn({ name: 'Id' })
  id: number;

  @Column({ name: 'CustomerId', type: 'int' })
  customerId: number;

  @Column({ name: 'EmployeeId', type: 'int' })
  employeeId: number;

  @Column({ name: 'IsFinished', type: 'boolean', default: false })
  isFinished: boolean;

  @Column({ name: 'LastUpdated', type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  lastUpdated: Date;

  @ManyToOne(() => Customer, (customer) => customer.chat)
  customer: Customer;

  @ManyToOne(() => Employee, (employee) => employee.chat)
  employee: Employee;
}
