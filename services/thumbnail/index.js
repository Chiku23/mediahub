import express from "express";
import prisma from "./prisma.js";
import authenticateToken from "./middleware/auth.js";
import sharp from "sharp";
import ffmpeg from "fluent-ffmpeg";
import ffmpegBinary from "ffmpeg-static";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

// Fix __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use correct ffmpeg binary
ffmpeg.setFfmpegPath(ffmpegBinary);

const app = express();
app.use(express.json());

app.use(cors({
    origin: "*",
    methods: "GET,POST,PUT,DELETE,OPTIONS",
    allowedHeaders: "Content-Type, Authorization"
}));

// health check
app.get("/", (req, res) => {
  res.json({ message: "Thumbnail service running" });
});

app.post("/thumbnail", authenticateToken, async (req, res) => {
  const { mediafileID } = req.body;
  const id = parseInt(mediafileID);

  const media = await prisma.mediaFile.findUnique({
    where: { id },
  });

  if (!media) {
    return res.status(404).json({ error: "Media not found" });
  }

  const uploadPath = path.resolve(
    __dirname,
    "..",
    "upload",
    media.path
  );

  const thumbnailName = media.id + "_thumb.jpg";

  const thumbnailPath = path.resolve(
    __dirname,
    "..",
    "upload",
    "thumbnails",
    thumbnailName
  );

  try {
    let type = media.type.toLowerCase();

    // Create thumbnail folder if missing
    const thumbDir = path.resolve(__dirname, "..", "upload", "thumbnails");
    if (!fs.existsSync(thumbDir)) {
      fs.mkdirSync(thumbDir, { recursive: true });
    }

    if (type.startsWith("image/")) {
      await generateImageThumbnail(uploadPath, thumbnailPath);
    } 
    else if (type.startsWith("video/")) {
      await generateVideoThumbnail(uploadPath, thumbnailPath);
    } 
    else {
      return res.json({ message: "Unsupported media type for thumbnail." });
    }

    await prisma.mediaFile.update({
      where: { id },
      data: {
        thumbnail: "thumbnails/" + thumbnailName
      },
    });

    res.json({
      message: "Thumbnail generated",
      thumbnail: "thumbnails/" + thumbnailName,
    });

  } catch (err) {
    console.error("Thumbnail error:", err);
    res.status(500).json({ error: "Failed to generate thumbnail" });
  }
});

async function generateImageThumbnail(inputPath, outputPath) {
  await sharp(inputPath)
    .resize(300) // max width 300
    .jpeg({ quality: 80 })
    .toFile(outputPath);
}

async function generateVideoThumbnail(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .on("end", resolve)
      .on("error", reject)
      .screenshots({
        timestamps: ["3"],  // grab frame at 3 seconds
        filename: path.basename(outputPath),
        folder: path.dirname(outputPath),
        size: "300x?"
      });
  });
}

const PORT = process.env.PORT;
app.listen(PORT, () => {
    console.log(`Thumbnail service running on port:`, PORT);
});
