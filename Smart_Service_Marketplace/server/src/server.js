
import "./config/checkEnv.js";

import app from "./app.js";
import connectDB from "./config/db.js";

const PORT = process.env.PORT || 5000;

await connectDB();

console.log(process.env.PORT);
console.log(process.env.JWT_SECRET);

app.listen(PORT, () => {
  console.log(
    `Server running on http://localhost:${PORT}`
  );
});