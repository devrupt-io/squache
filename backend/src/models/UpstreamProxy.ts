import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database';

export interface UpstreamProxyAttributes {
  id?: number;
  name: string;
  type: 'vpn' | 'residential' | 'datacenter';
  provider: string | null;
  // Connection details (for direct proxy)
  host: string | null;
  port: number | null;
  username: string | null;
  password: string | null;
  // Original URL pattern if provided
  proxyUrl: string | null;
  // Location filters (for provider-based proxies)
  countryFilter: string | null;  // ISO country code to filter to
  cityFilter: string | null;     // City name to filter to
  // Legacy fields (kept for backwards compatibility)
  country: string | null;
  city: string | null;
  enabled: boolean;
  priority: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export class UpstreamProxy extends Model<UpstreamProxyAttributes> implements UpstreamProxyAttributes {
  public id!: number;
  public name!: string;
  public type!: 'vpn' | 'residential' | 'datacenter';
  public provider!: string | null;
  public host!: string | null;
  public port!: number | null;
  public username!: string | null;
  public password!: string | null;
  public proxyUrl!: string | null;
  public countryFilter!: string | null;
  public cityFilter!: string | null;
  public country!: string | null;
  public city!: string | null;
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
    provider: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    host: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    port: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    proxyUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    countryFilter: {
      type: DataTypes.STRING(2),
      allowNull: true,
    },
    cityFilter: {
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
