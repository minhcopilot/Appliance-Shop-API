require('dotenv').config();
import 'reflect-metadata';
import { DataSource } from 'typeorm';
const { HOST, PASSWORD } = require('./constants/db');

export const AppDataSource = new DataSource({
  type: 'mssql',
  host: `${HOST}`,
  port: 1433,
  username: 'developer',
  // username: 'minh5520_SQLLogin_1',
  password: `${PASSWORD}`,
  // database: 'ShopGiaDung',
  database: 'TypeOrm',
  entities: ['entities/**/*.entity{.ts,.js}', 'entities/**/*.schema{.ts,.js}'],
  synchronize: true,
  logging: false,
  options: {
    encrypt: false,
  },
});
