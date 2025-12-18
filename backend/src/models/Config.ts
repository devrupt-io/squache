import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database';

export interface ConfigAttributes {
  id?: number;
  key: string;
  value: string;
  description: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Config extends Model<ConfigAttributes> implements ConfigAttributes {
  public id!: number;
  public key!: string;
  public value!: string;
  public description!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Config.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    key: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'config',
  }
);
