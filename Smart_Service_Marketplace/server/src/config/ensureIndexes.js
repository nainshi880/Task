import mongoose from "mongoose";
import logger from "../utils/logger.js";
import "../models/index.js";

/**
 * Sync MongoDB indexes for all registered models at startup.
 */
export default async function ensureIndexes() {
  if (process.env.SYNC_INDEXES === "false") {
    logger.info("Index sync skipped (SYNC_INDEXES=false).");
    return;
  }

  const modelNames = mongoose.modelNames();

  for (const name of modelNames) {
    try {
      await mongoose.model(name).syncIndexes();
      logger.info(`Indexes synced: ${name}`);
    } catch (error) {
      logger.warn(`Index sync warning for ${name}: ${error.message}`);
    }
  }
}
