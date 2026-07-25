import cors from "cors";
import dotenv from "dotenv";
import express from "express";

import { errorHandler } from "./middlewares/errorHandler";
import faturasRoutes from "./routes/faturas.routes";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_, res) => {
  res.json({
    status: "online"
  });
});

app.use("/api/faturas", faturasRoutes);

app.use(errorHandler);

const PORT = Number(process.env.PORT) || 3333;

app.listen(PORT, () => {
  console.log(`Servidor iniciado na porta ${PORT}`);
});