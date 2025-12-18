import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database';

export interface UserAttributes {
  id?: number;
  email: string;
  password: string;
  role: 'admin' | 'viewer';
  createdAt?: Date;
  updatedAt?: Date;
}

export class User extends Model<UserAttributes> implements UserAttributes {
  public id!: number;
  public email!: string;
  public password!: string;
  public role!: 'admin' | 'viewer';
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM('admin', 'viewer'),
      allowNull: false,
      defaultValue: 'viewer',
    },
  },
  {
    sequelize,
    tableName: 'users',
  }
);
