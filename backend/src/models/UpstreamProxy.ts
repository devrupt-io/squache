import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database';

export interface UpstreamProxyAttributes {
  id?: number;
  name: string;
  type: 'vpn' | 'residential' | 'datacenter';
  host: string;
  port: number;
  username: string | null;
  password: string | null;
  country: string | null;
  city: string | null;
  provider: string | null;
  enabled: boolean;
  priority: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export class UpstreamProxy extends Model<UpstreamProxyAttributes> implements UpstreamProxyAttributes {
  public id!: number;
  public name!: string;
  public type!: 'vpn' | 'residential' | 'datacenter';
  public host!: string;
  public port!: number;
  public username!: string | null;
  public password!: string | null;
  public country!: string | null;
  public city!: string | null;
  public provider!: string | null;
  public enabled!: boolean;
  public priority!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

UpstreamProxy.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    type: {
      type: DataTypes.ENUM('vpn', 'residential', 'datacenter'),
      allowNull: false,
    },
    host: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    port: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    country: {
      type: DataTypes.STRING(2),
      allowNull: true,
    },
    city: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    provider: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    priority: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    tableName: 'upstream_proxies',
  }
);
