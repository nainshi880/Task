import mongoose from "mongoose";
import logger from "./logger.js";

/**
 * Runs work inside a MongoDB transaction when possible.
 * Falls back to non-transactional execution if the deployment
 * does not support transactions (e.g. standalone MongoDB).
 */
export async function withTransaction(work) {
  let session;

  try {
    session = await mongoose.startSession();
    session.startTransaction();

    const result = await work(session);

    await session.commitTransaction();
    return result;
  } catch (error) {
    if (session?.inTransaction()) {
      await session.abortTransaction();
    }

    const message = error?.message || "";
    const transactionUnsupported =
      message.includes("Transaction numbers are only allowed") ||
      message.includes("replica set") ||
      message.includes("mongos") ||
      error?.code === 20;

    if (transactionUnsupported) {
      logger.warn(
        "MongoDB transactions unavailable — running without session."
      );
      return await work(null);
    }

    throw error;
  } finally {
    if (session) {
      session.endSession();
    }
  }
}

export default withTransaction;
