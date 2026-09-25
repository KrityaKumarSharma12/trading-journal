import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth.routes";
import tradeRoutes from "./routes/trades.routes";
import analyticsRoutes from "./routes/analytics.routes";
import strategyRoutes from "./routes/strategies.routes";

const app = express();

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/auth", authRoutes);
app.use("/trades", tradeRoutes);
app.use("/analytics", analyticsRoutes);
app.use("/strategies", strategyRoutes);

const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => {
  console.log(`API running on :${PORT}`);
});