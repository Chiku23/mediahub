import express from "express";
import prisma from "./prisma.js";
import authenticateToken from "./middleware/auth.js";
import ffmpeg from "fluent-ffmpeg";
import ffprobe from "ffprobe-static";
import fs from "fs";
import path from "path";
import { PDFDocument } from "pdf-lib";
import { fileURLToPath } from "url";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { imageSize } = require("image-size");
import cors from "cors";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import dotenv from "dotenv";
dotenv.config();

// connect ffprobe to fluent-ffmpeg
ffmpeg.setFfprobePath(ffprobe.path);

const app = express();
app.use(express.json());
app.use(cors({
    origin: "*",
    methods: "GET,POST,PUT,DELETE,OPTIONS",
    allowedHeaders: "Content-Type, Authorization"
}));
// health check
app.get("/", (req, res) => {
  res.json({ message: "Metadata service running" });
});

// ======================
//   METADATA EXTRACTION
// ======================

app.post("/process", authenticateToken, async (req, res) => {
  const { mediafileID } = req.body;
  const id = parseInt(mediafileID);
  // get file from DB
  const media = await prisma.mediaFile.findUnique({
    where: { id },
  });

  if (!media) {
    return res.status(404).json({ error: "Media not found" });
  }

  const filePath = path.join(
    __dirname,
    "..",
    "upload",
    media.path // "uploads/filename"
  );

  if (!fs.existsSync(filePath)) {
    console.error("FILE DOES NOT EXIST:", filePath);
    return res.status(404).json({
      error: "File not found on server",
      filePath
    });
  }

  try {
    let metadata;

    if (media.type.startsWith("image/")) {
      metadata = extractImageMeta(filePath);
    } 
    else if (media.type.startsWith("video/")) {
      metadata = await extractVideoMeta(filePath);
    } 
    else if (media.type.startsWith("audio/")) {
      metadata = await extractAudioMeta(filePath);
    } 
    else if (media.type === "application/pdf") {
      metadata = await extractPdfMeta(filePath);
    } 
    else {
      return res.json({ message: "Unsupported file type" });
    }

    // Save metadata JSON
    await prisma.mediaMetadata.upsert({
      where: { mediaId: id },
      update: { data: metadata },
      create: { mediaId: id, data: metadata }
    });

    // Update media status
    await prisma.mediaFile.update({
      where: { id },
      data: { status: "metadata_done" },
    });


    return res.json({
      message: "Metadata extracted",
      metadata,
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Metadata extraction failed" });
  }
});

// -------------------------------
// Image metadata
// -------------------------------
function extractImageMeta(path) {
  const buffer = fs.readFileSync(path);
  const dim = imageSize(buffer);
  return {
    width: dim.width,
    height: dim.height,
    type: dim.type,
  };
}

// -------------------------------
// Video metadata
// -------------------------------
function extractVideoMeta(path) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(path, (err, data) => {
      if (err) return reject(err);
      resolve({
        duration: data.format.duration,
        size: data.format.size,
        format: data.format.format_long_name,
        bitrate: data.format.bit_rate,
      });
    });
  });
}

// -------------------------------
// Audio metadata
// -------------------------------
function extractAudioMeta(path) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(path, (err, data) => {
      if (err) return reject(err);
      resolve({
        duration: data.format.duration,
        format: data.format.format_long_name,
        bitrate: data.format.bit_rate,
      });
    });
  });
}

// -------------------------------
// PDF metadata
// -------------------------------
async function extractPdfMeta(filePath) {
  const fileData = fs.readFileSync(filePath);

  const pdfDoc = await PDFDocument.load(fileData);

  const pages = pdfDoc.getPages();
  const pageCount = pages.length;

  // Extract basic text from first page
  const firstPage = pages[0];
  let textPreview = "";

  try {
    const { text } = await firstPage.getTextContent();
    textPreview = text.slice(0, 200);
  } catch {
    textPreview = "Text extraction not available";
  }

  return {
    pages: pageCount,
    textPreview
  };
}

const PORT = process.env.PORT;
app.listen(PORT, () => {
    console.log(`Metadata service running on port:`, PORT);
});

