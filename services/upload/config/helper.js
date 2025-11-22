import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
dotenv.config();

const isDEBUG = process.env.DEBUG;

// Resolve file paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Log folder in auth service
const logDir = path.join(__dirname, "../logs");
const logFile = path.join(logDir, "upload.log");

// Ensure log folder exists
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// Ensure log file exists
if (!fs.existsSync(logFile)) {
    fs.writeFileSync(logFile, ""); // create empty file
}

// Logger function
export function logger(message = "", level = "info") {
    if(!isDEBUG){
        return;
    }
    const timestamp = new Date().toISOString();

    // Convert ANYTHING to readable output
    let formatted;

    try {
        if (typeof message === "string") {
            formatted = message;
        } else {
            // Pretty-print objects, arrays, numbers, booleans, etc.
            formatted = JSON.stringify(message, null, 2);
        }
    } catch (e) {
        // Fallback if JSON.stringify fails (circular objects)
        formatted = String(message);
    }

    const entry = `[${timestamp}] [${level.toUpperCase()}]\n${formatted}\n\n`;

    fs.appendFile(logFile, entry, (err) => {
        if (err) console.error("Logger error:", err);
    });
}


export default [logger];
