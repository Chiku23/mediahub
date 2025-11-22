import express from "express";
import prisma from "./prisma.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { authenticateToken } from "./middleware/auth.js";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(express.json());
app.use(cors({
    origin: "*",
    methods: "GET,POST,PUT,DELETE,OPTIONS",
    allowedHeaders: "Content-Type, Authorization"
}));

app.get("/", (req, res) => {
  res.json({ message: "Media service running" });
});

app.get("/media", authenticateToken, async (req, res) => {
  try {
    const files = await prisma.mediaFile.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        path: true,
        type: true,
        size: true,
        status: true,
        createdAt: true,
        thumbnail: true
      }
    });

    res.json({ files });

  } catch (error) {
    console.error("Error fetching media:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/media/:id", authenticateToken, async (req, res) => {
  try {
    const mediaId = parseInt(req.params.id);

    const file = await prisma.mediaFile.findUnique({
      where: { id: mediaId },
      select: {
        id: true,
        path: true,
        type: true,
        size: true,
        status: true,
        createdAt: true
      }
    });

    if (!file) {
      return res.status(404).json({ error: "Media not found" });
    }

    res.json({ file });

  } catch (error) {
    console.error("Error fetching media:", error);
    res.status(500).json({ error: "Server error" });
  }
});

const PORT = process.env.PORT;
app.listen(PORT, () => {
    console.log(`Media service running on port:`, PORT);
});
