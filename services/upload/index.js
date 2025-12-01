import express from "express";
import multer from "multer";
import prisma from "./prisma.js";
import authenticateToken from "./middleware/auth.js";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
dotenv.config();
import {logger} from "./config/helper.js"

const app = express();
app.use(express.json({ limit: "500mb" }));
app.use(express.urlencoded({ extended: true, limit: "500mb" }));

app.use(cors({
    origin: "*",
    methods: "GET,POST,PUT,DELETE,OPTIONS",
    allowedHeaders: "Content-Type, Authorization"
}));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Serve static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/thumbnails", express.static(path.join(__dirname, "thumbnails")));

// Multer storage with correct filenames
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "uploads"));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = Date.now() + "-" + Math.round(Math.random() * 1e9) + ext;
    cb(null, name);
  }
});

const upload = multer({ storage });

const allowedTypes = [
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "video/mp4", "video/mpeg", "video/quicktime", "video/x-matroska",
  "audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg",
  "application/pdf"
];

app.post("/upload", authenticateToken, upload.single("file"), async (req, res) => {
  const file = req.file;
  logger("upload start");
  if (!file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  if (!allowedTypes.includes(file.mimetype)) {
    return res.status(400).json({ error: "Unsupported file type" });
  }

  // SAVE WITH uploads/ prefix
  const dbPath = "uploads/" + file.filename;

  const media = await prisma.mediaFile.create({
    data: {
      path: dbPath, 
      type: file.mimetype,
      size: file.size,
      originalName: file.originalname,
      status: "new"
    }
  });

  const THUMB_URL = process.env.THUMBNAIL_SERVICE_URL;
  const META_URL  = process.env.METADATA_SERVICE_URL;
  const TRANSCODE_URL = process.env.TRANSCODER_SERVICE_URL;

  // Thumbnail Service - Generate thumbnails
  if (THUMB_URL) {
    fetch(`${THUMB_URL}/thumbnail`, {
      method: "POST",
      headers: { Authorization: req.headers.authorization, "Content-Type": "application/json" },
      body : JSON.stringify({ mediafileID : media.id })
    }).catch(err => console.log("Thumbnail service error:", err));
  }

  // Metadata Service - Generate metadata
  if (META_URL) {
    fetch(`${META_URL}/process`, {
      method: "POST",
      headers: { Authorization: req.headers.authorization, "Content-Type": "application/json" },
      body : JSON.stringify({ mediafileID : media.id })
    }).catch(err => console.log("Metadata service error:", err));
  }
  
  // Transcoder Service - generate HLS stream
  if (TRANSCODE_URL && file.mimetype.startsWith("video/")) {
      fetch(`${TRANSCODE_URL}/transcode`, {
          method: "POST",
          headers: { 
              Authorization: req.headers.authorization, 
              "Content-Type": "application/json" 
          },
          body: JSON.stringify({
              mediafileID: media.id,
              path: dbPath  // uploads/filename.mp4
          })
      }).catch(err => console.log("Transcoder service error:", err));
  }
  logger("upload complete");
  return res.json({
    message: "File uploaded",
    fileId: media.id
  });
});



const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log("Upload service running on port", PORT);
});
