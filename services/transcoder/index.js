import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { logger } from "./config/helper.js";
import ffmpeg from "fluent-ffmpeg";
dotenv.config();

const ffmpegPath = process.env.FFMPEGPATH;
// Set ffmpeg binary
ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();
app.use(express.json());
app.use(cors({
    origin: "*",
    methods: "GET,POST,PUT,DELETE,OPTIONS",
    allowedHeaders: "Content-Type, Authorization"
}));

const MEDIA_SERVICE_URL = process.env.MEDIA_SERVICE_URL;
const UPLOADS_PATH = process.env.UPLOADS_PATH;
const STREAMS_PATH = process.env.STREAMS_PATH;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure global streams directory exists
if (!fs.existsSync(STREAMS_PATH)) {
    fs.mkdirSync(STREAMS_PATH, { recursive: true });
}

// Serve HLS segments
app.use(
    "/streams",
    express.static(path.join(__dirname, "..", "upload", "streams"))
);

// ---------------------------------------------------------
// MULTI-QUALITY: 1080p
// ---------------------------------------------------------
async function run1080p(inputFile, outputFolder) {
    return new Promise((resolve, reject) => {
        ffmpeg(inputFile)
            .inputOptions([
                "-hwaccel cuda",
                "-hwaccel_output_format cuda"
            ])
            .videoCodec("h264_nvenc")
            .audioCodec("aac")
            .outputOptions([
                "-filter_complex scale_cuda=1920:1080",
                "-preset fast",
                "-b:v 5000k",
                "-maxrate 5000k",
                "-bufsize 10000k",
                "-rc vbr",
                "-hls_time 15",
                "-hls_list_size 0",
                `-hls_segment_filename ${outputFolder}/1080p/seg_%03d.ts`
            ])
            .output(`${outputFolder}/1080p/index.m3u8`)
            .on("start", cmd => logger("1080p GPU FFmpeg:\n" + cmd))
            .on("end", resolve)
            .on("error", reject)
            .run();
    });
}

// ---------------------------------------------------------
// MULTI-QUALITY: 720p
// ---------------------------------------------------------
async function run720p(inputFile, outputFolder) {
    return new Promise((resolve, reject) => {
        ffmpeg(inputFile)
            .inputOptions([
                "-hwaccel cuda",
                "-hwaccel_output_format cuda"
            ])
            .videoCodec("h264_nvenc")
            .audioCodec("aac")
            .outputOptions([
                "-filter_complex scale_cuda=1280:720",
                "-preset fast",
                "-b:v 2800k",
                "-maxrate 2800k",
                "-bufsize 6000k",
                "-rc vbr",
                "-hls_time 15",
                "-hls_list_size 0",
                `-hls_segment_filename ${outputFolder}/720p/seg_%03d.ts`
            ])
            .output(`${outputFolder}/720p/index.m3u8`)
            .on("start", cmd => logger("720p GPU FFmpeg:\n" + cmd))
            .on("end", resolve)
            .on("error", reject)
            .run();
    });
}

// ---------------------------------------------------------
// MULTI-QUALITY: 480p
// ---------------------------------------------------------
async function run480p(inputFile, outputFolder) {
    return new Promise((resolve, reject) => {
        ffmpeg(inputFile)
            .inputOptions([
                "-hwaccel cuda",
                "-hwaccel_output_format cuda"
            ])
            .videoCodec("h264_nvenc")
            .audioCodec("aac")
            .outputOptions([
                "-filter_complex scale_cuda=854:480",
                "-preset fast",
                "-b:v 1400k",
                "-maxrate 1400k",
                "-bufsize 3000k",
                "-rc vbr",
                "-hls_time 20",
                "-hls_list_size 0",
                `-hls_segment_filename ${outputFolder}/480p/seg_%03d.ts`
            ])
            .output(`${outputFolder}/480p/index.m3u8`)
            .on("start", cmd => logger("480p GPU FFmpeg:\n" + cmd))
            .on("end", resolve)
            .on("error", reject)
            .run();
    });
}


// ---------------------------------------------------------
// TRANSCODE ROUTE
// ---------------------------------------------------------
app.post("/transcode", async (req, res) => {
    const { mediafileID, path: rawPath } = req.body;

    if (!mediafileID || !rawPath) {
        return res.status(400).json({ error: "Missing mediafileID or path" });
    }

    logger(`Transcoding started for ID: ${mediafileID}`);

    // Mark media as processing
    fetch(`${MEDIA_SERVICE_URL}/update-stream-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            id: mediafileID,
            streamStatus: "processing"
        })
    }).catch(() => {});

    try {
        const inputFile = path.join(UPLOADS_PATH, rawPath.replace("uploads/", ""));
        const outputFolder = path.join(STREAMS_PATH, String(mediafileID));

        // Ensure output folders exist
        fs.mkdirSync(`${outputFolder}/1080p`, { recursive: true });
        fs.mkdirSync(`${outputFolder}/720p`, { recursive: true });
        fs.mkdirSync(`${outputFolder}/480p`, { recursive: true });

        // Run the three HLS qualities sequentially
        await run1080p(inputFile, outputFolder);
        await run720p(inputFile, outputFolder);
        await run480p(inputFile, outputFolder);

        // Create master playlist
        const masterContent = `
        #EXTM3U
        #EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080
        1080p/index.m3u8
        #EXT-X-STREAM-INF:BANDWIDTH=2800000,RESOLUTION=1280x720
        720p/index.m3u8
        #EXT-X-STREAM-INF:BANDWIDTH=1400000,RESOLUTION=854x480
        480p/index.m3u8
        `;

        fs.writeFileSync(`${outputFolder}/master.m3u8`, masterContent.trim());

        logger(`Multi-quality HLS transcoding complete for ID: ${mediafileID}`);

        // Mark media as ready
        fetch(`${MEDIA_SERVICE_URL}/update-stream-status`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id: mediafileID,
                streamStatus: "ready",
                streamPath: `streams/${mediafileID}/master.m3u8`,
                streamFolder: `streams/${mediafileID}/`
            })
        }).catch(() => {});

        res.json({ message: "Transcoding complete", id: mediafileID });

    } catch (error) {
        logger("Transcoding error: " + error);

        fetch(`${MEDIA_SERVICE_URL}/update-stream-status`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id: mediafileID,
                streamStatus: "failed"
            })
        }).catch(() => {});

        res.status(500).json({ error: "Transcoding failed" });
    }
});

app.listen(process.env.PORT, () => {
    console.log("Transcoder service running on port:", process.env.PORT);
});
