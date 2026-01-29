import express from "express";
import dotenv from "dotenv";

import sheetsRoutes from "./routesSheets.js";
import driveRoutes from "./routesDrive.js";

dotenv.config();

const app = express();
app.use(express.json());

// routes
app.use("/api/sheets", sheetsRoutes);
app.use("/api/drive", driveRoutes);

app.get("/api/health", (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API server running on http://localhost:${PORT}`));
