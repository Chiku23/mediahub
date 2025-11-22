import express from "express";
import multer from "multer";
import prisma from "./prisma.js";
import authenticateToken from "./middleware/auth.js";
import "dotenv/config";

const app = express();

// storage location for uploaded files
const upload = multer({ dest: "uploads/" });

app.post("/upload", authenticateToken, upload.single("file"), async (req, res) => {
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const media = await prisma.mediaFile.create({
    data: {
      path: file.path,
      type: file.mimetype,
      size: file.size,
      status: "new"
    }
  });

  return res.json({
    message: "File uploaded",
    fileId: media.id
  });
});

const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log("Upload service running on port", PORT);
});
