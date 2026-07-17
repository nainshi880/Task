import "./config/checkEnv.js";

import http from "http";
import app from "./app.js";
import connectDB from "./config/db.js";
import { initFirebase } from "./config/firebase.js";
import { initChatSocket } from "./sockets/chat.socket.js";
import { startNotificationWorker } from "./workers/notification.worker.js";
import { getRedisClient } from "./config/redis.js";

const PORT = process.env.PORT || 5000;

await connectDB();

// Warm up FCM (no-op if credentials missing)
initFirebase();

// Warm Redis cache client (optional)
getRedisClient();

const server = http.createServer(app);
const io = await initChatSocket(server);

app.set("io", io);

// BullMQ notification / push / email / SMS worker (requires REDIS_URL)
startNotificationWorker();

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Socket.IO ready at path /socket.io`);
});
