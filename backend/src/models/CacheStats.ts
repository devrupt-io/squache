import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database';

export interface CacheStatsAttributes {
  id?: number;
  timestamp: Date;
  period: 'minute' | 'hour' | 'day';
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  bytesSent: number;
  bytesFromCache: number;
  avgResponseTime: number;
  createdAt?: Date;
}

export class CacheStats extends Model<CacheStatsAttributes> implements CacheStatsAttributes {
  public id!: number;
  public timestamp!: Date;
  public period!: 'minute' | 'hour' | 'day';
  public totalRequests!: number;
  public cacheHits!: number;
  public cacheMisses!: number;
  public bytesSent!: number;
  public bytesFromCache!: number;
  public avgResponseTime!: number;
  public readonly createdAt!: Date;
}

CacheStats.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    period: {
      type: DataTypes.ENUM('minute', 'hour', 'day'),
      allowNull: false,
    },
    totalRequests: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    cacheHits: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    cacheMisses: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    bytesSent: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 0,
    },
    bytesFromCache: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 0,
    },
    avgResponseTime: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    tableName: 'cache_stats',
    updatedAt: false,
    indexes: [
      { fields: ['timestamp', 'period'] },
    ],
  }
);
