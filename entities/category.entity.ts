import { IsNotEmpty, Length, MaxLength, ValidateIf, validate, validateOrReject } from 'class-validator';
import { BaseEntity, BeforeInsert, BeforeUpdate, Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Product } from './product.entity';

@Entity({ name: 'Categories' })
export class Category extends BaseEntity {
  @PrimaryGeneratedColumn({ name: 'Id' })
  id: number;

  // ----------------------------------------------------------------------------------------------
  // NAME
  // ----------------------------------------------------------------------------------------------
  @IsNotEmpty({ message: 'Name is required' })
  @Length(2, 50, { message: '[$property] of [$target]: [$value] must be greater than $constraint1 and less than $constraint2 characters' })
  @Column({ name: 'Name', unique: true, type: 'nvarchar', length: 100 })
  name: string;

  // ----------------------------------------------------------------------------------------------
  // DESCRIPTION
  // ----------------------------------------------------------------------------------------------
  @Column({ name: 'Description', type: 'nvarchar', length: 500, nullable: true })
  description: string;


  @Column({ name: 'ParentId' })
  ParentId: number


  // CoverImageUrl
  // ----------------------------------------------------------------------------------------------
  @Column({ name: 'CoverImageUrl', type: 'nvarchar', length: 500, nullable: true })
  CoverImageUrl: string;


  // Active
  // ----------------------------------------------------------------------------------------------
  @Column({ name: 'Active', type: 'boolean', nullable: false })
  Active: boolean;


  // IsDeleted
  // ----------------------------------------------------------------------------------------------
  @Column({ name: 'IsDeleted', type: 'boolean', nullable: true})
  IsDeleted: boolean;

  @CreateDateColumn({ name: 'CreatedAt', type: 'datetime' })
  createdAt: Date;

  @Column({ name: 'CreatedBy', type: 'varchar', length: 100, nullable: true })
  createdBy: string;

  @UpdateDateColumn({ name: 'UpdatedAt', type: 'datetime' })
  updatedAt: Date;

  @Column({ name: 'UpdatedBy', type: 'varchar', length: 100, nullable: true })
  updatedBy: string;



  // ----------------------------------------------------------------------------------------------
  // RELATIONS
  // ----------------------------------------------------------------------------------------------
  @OneToMany(() => Product, (p) => p.category)
  products: Product[];

  // MANUAL VALIDATION
  // async validate() {
  //   const errors = await validate(this);
  //   if (errors.length > 0) {
  //     return errors;
  //   }

  //   return null;
  // }

  // HOOKS (AUTO VALIDATE)
  @BeforeInsert()
  @BeforeUpdate()
  async validate() {
    await validateOrReject(this);
  }
}

