import "../config/checkEnv.js";
import connectDB from "../config/db.js";
import { seedSuperAdmin } from "./seedSuperAdmin.js";
import logger from "../utils/logger.js";

await connectDB();
await seedSuperAdmin();
logger.info("Super Admin seed finished.");
process.exit(0);
