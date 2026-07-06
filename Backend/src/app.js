import express from "express";
import employeeRoutes from "./routes/employee.routes.js"
import helmet from "helmet";
import errorHandler from "./middlewares/error.middleware.js";

import cors from "cors";
import rateLimit from "express-rate-limit"

const app = express();

app.use(helmet()); 

app.use(cors({
   origin: "http://localhost:5173",
   credentials: true,
})
 
);const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests. Please try again later.",
});

app.use(limiter);


app.use(express.json());

app.use("./api/employees", employeeRoutes);
app.use(
    "/api/employees",
    employeeRoutes
);  

app.use(errorHandler);

export default app; 