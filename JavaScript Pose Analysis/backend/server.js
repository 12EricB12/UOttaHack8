import "dotenv/config";
import express from "express";
import multer from "multer"; // <--- NEW: For file uploads
import cors from "cors"; // <--- NEW: To allow mobile connection
import fs from "fs"; // <--- NEW: To manage folders
import VideoAnalyzer from "./VideoAnalyzer.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

// CONFIGURATION: Default fallback if no file is uploaded
const DEFAULT_VIDEO_FILE = "test_squat_sideway.mp4";

// 1. ENABLE CORS (Crucial for mobile testing)
app.use(cors());
app.use(express.json());

// 2. CONFIGURE STORAGE (Multer)
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Save as "video-<timestamp>.webm"
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "video-" + uniqueSuffix + ".webm");
  },
});

const upload = multer({ storage: storage });

// Serve static files
app.use("/temp", express.static(path.join(__dirname, "temp")));
app.use("/uploads", express.static(uploadDir)); // Serve uploaded files too if needed

app.get("/", (req, res) => {
  res.send(
    "Pose Analysis Backend is running. <br> POST video to /upload <br> GET /analyze?filename=YOUR_FILE.webm",
  );
});

// --- NEW ENDPOINT: UPLOAD VIDEO ---
app.post("/upload", upload.single("video"), (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, error: "No video file provided" });
    }
    console.log(`[SERVER] File uploaded successfully: ${req.file.filename}`);

    // Return the filename so the frontend can pass it to /analyze
    res.json({ success: true, filename: req.file.filename });
  } catch (error) {
    console.error("[SERVER] Upload error:", error);
    res.status(500).json({ success: false, error: "Upload failed" });
  }
});

// --- HELPER: Resolve Video Path ---
// Checks if the file is in 'uploads/' (from phone) or root (local test)
const resolveVideoPath = (filename) => {
  const uploadPath = path.join(uploadDir, filename);
  if (fs.existsSync(uploadPath)) return uploadPath;

  const rootPath = path.join(__dirname, `../${filename}`);
  if (fs.existsSync(rootPath)) return rootPath;

  return null;
};

app.get("/analyze", async (req, res) => {
  // Check if frontend sent a specific filename, otherwise use default
  const requestedFile = req.query.filename || DEFAULT_VIDEO_FILE;
  console.log(`[SERVER] Received analysis request for ${requestedFile}...`);

  const videoPath = resolveVideoPath(requestedFile);
  if (!videoPath) {
    return res
      .status(404)
      .json({ success: false, error: "Video file not found." });
  }

  const apiKey = req.headers["x-api-key"] || process.env.GEMINI_API_KEY;
  const MOVEMENT_TYPE = "squat";
  const analyzer = new VideoAnalyzer(videoPath, 5, 1920, 1080);

  try {
    console.log("[SERVER] Splitting frames...");
    await analyzer.splitFrames();

    if (apiKey) {
      console.log("[SERVER] Gemini API Key found. Switching to AI analysis...");
      const analysis = await analyzer.analyzeWithGemini(apiKey);

      console.log(`\n[GEMINI] Overall Rating: ${analysis.overall_rating}/100`);
      console.log(`[GEMINI] Comment: ${analysis.overall_comment}\n`);

      res.json({ success: true, analysis });
      return;
    }

    console.log("[SERVER] Initializing local analyzer...");
    await analyzer.initialize();

    // Find key frames
    const keyFrames = await analyzer.findKeyTime(MOVEMENT_TYPE);
    const bestFrame =
      keyFrames && keyFrames.length > 0 ? keyFrames[0] : "0.jpg";
    console.log(`[SERVER] Generating report for frame: ${bestFrame}`);

    const fullImagePath = path.join(analyzer.sequencePath, bestFrame);
    const scores = await analyzer.analyzeBottomPosition(
      fullImagePath,
      MOVEMENT_TYPE,
    );
    const report = analyzer.generateFeedback(scores);

    res.json({ success: true, report });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/analyze-gemini", async (req, res) => {
  const requestedFile = req.query.filename || DEFAULT_VIDEO_FILE;
  console.log(
    `[SERVER] Received Gemini analysis request for ${requestedFile}...`,
  );

  const apiKey = req.headers["x-api-key"] || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res
      .status(400)
      .json({ success: false, error: "Gemini API Key is required." });
  }

  const videoPath = resolveVideoPath(requestedFile);
  if (!videoPath) {
    return res
      .status(404)
      .json({ success: false, error: "Video file not found." });
  }

  const analyzer = new VideoAnalyzer(videoPath, 5, 1920, 1080);

  try {
    const analysis = await analyzer.analyzeWithGemini(apiKey);

    console.log("\n--- GEMINI ANALYSIS RESULTS ---");
    console.log(`Overall Rating: ${analysis.overall_rating}/100`);
    console.log(`Overall Comment: ${analysis.overall_comment}`);
    // ... (logging logic remains same)
    console.log("-------------------------------\n");

    res.json({ success: true, analysis });
  } catch (error) {
    console.error("[SERVER] Gemini Analysis failed:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(port, "0.0.0.0", () => {
  // Bind to 0.0.0.0 to allow external access
  console.log(`Server running at http://0.0.0.0:${port}`);
});
