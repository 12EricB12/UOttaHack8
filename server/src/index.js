import express from "express";
import http from "http";
import cors from "cors";
import { attachSocketServer } from "./socket.js";
import { gradingRoutes } from "./routes/gradingRoutes.js";

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "5mb" }));

app.get("/health", (req, res) => res.json({ ok: true }));
app.use("/api", gradingRoutes);

const server = http.createServer(app);
attachSocketServer(server);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running: http://localhost:${PORT}`));
