import express from "express";
import prisma from "./prisma.js";
import "dotenv/config";
import { env } from "prisma/config";

const app = express();
app.use(express.json());

// health check
app.get("/", (req, res) => {
    res.send("Auth service running");
});

const PORT = env("PORT");
app.listen(PORT, () => {
    console.log(`Auth service running on port:`, PORT);
});
