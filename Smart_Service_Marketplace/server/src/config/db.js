import mongoose from "mongoose";
import logger from "../utils/logger.js";

/**
 * Shared Mongo connection options for API + workers under load.
 * Larger pool + hard timeouts prevent indefinite waits that starve BullMQ slots.
 */
export const MONGO_CONNECT_OPTIONS = {
  maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE) || 100,
  minPoolSize: Number(process.env.MONGO_MIN_POOL_SIZE) || 10,
  serverSelectionTimeoutMS:
    Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS) || 5000,
  socketTimeoutMS: Number(process.env.MONGO_SOCKET_TIMEOUT_MS) || 15000,
};

const connectDB = async () => {
  try {
    const connection = await mongoose.connect(
      process.env.MONGODB_URI,
      MONGO_CONNECT_OPTIONS
    );

    logger.info(
      `MongoDB connected: ${connection.connection.host} (pool max=${MONGO_CONNECT_OPTIONS.maxPoolSize})`
    );
  } catch (error) {
    logger.error(`MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
