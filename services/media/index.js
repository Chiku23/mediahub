import express from "express";
import prisma from "./prisma.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { authenticateToken } from "./middleware/auth.js";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();
import { logger } from "./config/helper.js";

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
        thumbnail: true,
        originalName: true
      }
    });
    logger("Media Requested.");
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
        createdAt: true,
        originalName: true,
        streamStatus: true,
        streamPath: true 
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

app.post("/delete-media", authenticateToken, async (req, res) => {
  const { mediafileID } = req.body;
  const id = parseInt(mediafileID);

  try {
    const file = await prisma.mediaFile.findUnique({
      where: { id: id },
      select: {
        id: true,
      }
    });

    if (!file) {
      return res.status(404).json({ error: "Media not found" });
    }

    const deleteMedia = await prisma.mediaFile.delete({
      where: {
        id: id,
      },
    });

    if(!deleteMedia) {
      return res.status(404).json({ error: "Error deleting file." });
    }

    res.json({
      message: "File deleted succesfully"
    });

  } catch (error) {
    logger("Error deleting media:"+ error);
    res.status(500).json({ error: "Server error" });
  }
});

// ----------------------------------------------------
// UPDATE STREAM STATUS (called by transcoder-service)
// ----------------------------------------------------
app.post("/update-stream-status", async (req, res) => {
  const { id, streamStatus, streamPath, streamFolder } = req.body;

  try {
    const mediaId = parseInt(id);

    await prisma.mediaFile.update({
      where: { id: mediaId },
      data: {
        streamStatus: streamStatus || undefined,
        streamPath: streamPath || undefined,
        streamFolder: streamFolder || undefined
      }
    });

    res.json({ message: "Stream status updated" });

  } catch (error) {
    console.error("Error updating stream status:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/edit-media", authenticateToken, async (req, res) => {
    const { mediafileID, originalName } = req.body;

    if (!mediafileID || !originalName) {
        return res.status(400).json({ error: "Missing fields" });
    }

    try {
        const updated = await prisma.mediaFile.update({
            where: { id: parseInt(mediafileID) },
            data: { originalName }
        });

        res.json({ message: "Media name updated successfully" });

    } catch (error) {
        console.error("Error updating media:", error);
        res.status(500).json({ error: "Server error" });
    }
});

const PORT = process.env.PORT;
app.listen(PORT, () => {
    console.log(`Media service running on port:`, PORT);
});
