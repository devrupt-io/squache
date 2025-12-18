import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../database';

export interface AccessLogAttributes {
  id?: number;
  timestamp: Date;
  responseTime: number;
  clientIp: string;
  cacheStatus: string;
  httpStatus: number;
  bytesSent: number;
  method: string;
  url: string;
  username: string | null;
  hierarchyStatus: string;
  serverIp: string;
  mimeType: string;
  upstreamType: string | null;
  upstreamCountry: string | null;
  createdAt?: Date;
}

export class AccessLog extends Model<AccessLogAttributes> implements AccessLogAttributes {
  public id!: number;
  public timestamp!: Date;
  public responseTime!: number;
  public clientIp!: string;
  public cacheStatus!: string;
  public httpStatus!: number;
  public bytesSent!: number;
  public method!: string;
  public url!: string;
  public username!: string | null;
  public hierarchyStatus!: string;
  public serverIp!: string;
  public mimeType!: string;
  public upstreamType!: string | null;
  public upstreamCountry!: string | null;
  public readonly createdAt!: Date;
}

AccessLog.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    responseTime: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    clientIp: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    cacheStatus: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    httpStatus: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    bytesSent: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    method: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    url: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    hierarchyStatus: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    serverIp: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    mimeType: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    upstreamType: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    upstreamCountry: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'access_logs',
    updatedAt: false,
    indexes: [
      { fields: ['timestamp'] },
      { fields: ['cacheStatus'] },
      { fields: ['url'] },
      { fields: ['clientIp'] },
    ],
  }
);
