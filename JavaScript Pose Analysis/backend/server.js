import 'dotenv/config';
import express from 'express';
import VideoAnalyzer from './VideoAnalyzer.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

// CONFIGURATION: Change the video file here for both endpoints
const CURRENT_VIDEO_FILE = 'test_squat_sideway.mp4'; 

// Serve static files from 'temp' directory so images are viewable
app.use('/temp', express.static(path.join(__dirname, 'temp')));

app.get('/', (req, res) => {
    res.send('Pose Analysis Backend is running. Visit <a href="/analyze">/analyze</a> to run the simulation.');
});

app.get('/analyze', async (req, res) => {
    console.log(`[SERVER] Received local analysis request for ${CURRENT_VIDEO_FILE}...`);
    const apiKey = req.headers['x-api-key'] || process.env.GEMINI_API_KEY;
    
    // Mock video path (doesn't need to exist for this simulation)
    const videoPath = path.join(__dirname, `../${CURRENT_VIDEO_FILE}`); 
    const MOVEMENT_TYPE = "squat";

    const analyzer = new VideoAnalyzer(videoPath, 5, 1920, 1080);
    
    try {
        console.log("[SERVER] Splitting frames...");
        await analyzer.splitFrames();

        // If API Key is present, use Gemini (Real AI) instead of Mock
        if (apiKey) {
            console.log("[SERVER] Gemini API Key found. Switching to AI analysis...");
            const analysis = await analyzer.analyzeWithGemini(apiKey);
            
            // Log summary to terminal
            console.log(`\n[GEMINI] Overall Rating: ${analysis.overall_rating}/100`);
            console.log(`[GEMINI] Comment: ${analysis.overall_comment}\n`);

            res.json({ success: true, analysis });
            return;
        }

        console.log("[SERVER] Initializing analyzer...");
        await analyzer.initialize();

        // Generate URLs for verification
        const videoBaseName = path.basename(videoPath, path.extname(videoPath));
        const frameBaseUrl = `http://localhost:${port}/temp/images_${videoBaseName}`;
        const debugLinks = [0, 1, 2, 3, 4].map(i => `${frameBaseUrl}/${i}.jpg`);
        console.log("[SERVER] Verify frames at:", debugLinks);

        // Find key frames (or just use the first few if detection is tricky)
        const keyFrames = await analyzer.findKeyTime(MOVEMENT_TYPE);
        
        // Use the first key frame found, or default to 0 if none
        const bestFrame = (keyFrames && keyFrames.length > 0) ? keyFrames[0] : "0.jpg";
        console.log(`[SERVER] Generating report for frame: ${bestFrame}`);

        const fullImagePath = path.join(analyzer.sequencePath, bestFrame);
        const scores = await analyzer.analyzeBottomPosition(fullImagePath, MOVEMENT_TYPE);
        
        // Generate the formatted table report
        const report = analyzer.generateFeedback(scores);

        res.json({ success: true, report });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/analyze-gemini', async (req, res) => {
    console.log(`[SERVER] Received Gemini analysis request for ${CURRENT_VIDEO_FILE}...`);
    const apiKey = req.headers['x-api-key'] || process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(400).json({ success: false, error: "Gemini API Key is required. Pass it in 'x-api-key' header or set GEMINI_API_KEY env var." });
    }

    const videoPath = path.join(__dirname, `../${CURRENT_VIDEO_FILE}`); 
    const analyzer = new VideoAnalyzer(videoPath, 5, 1920, 1080);

    try {
        const analysis = await analyzer.analyzeWithGemini(apiKey);
        
        console.log("\n--- GEMINI ANALYSIS RESULTS ---");
        console.log(`Camera Angle: ${analysis.camera_angle}`);
        console.log(`Overall Rating: ${analysis.overall_rating}/100`);
        console.log(`Overall Comment: ${analysis.overall_comment}`);
        console.log("Detailed Breakdown:");
        if (analysis.detailed_ratings) {
            for (const [part, details] of Object.entries(analysis.detailed_ratings)) {
                console.log(`  - ${part}: ${details.rating}/100 (${details.comment})`);
            }
        }
        console.log("-------------------------------\n");

        res.json({ success: true, analysis });
    } catch (error) {
        console.error("[SERVER] Gemini Analysis failed:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
