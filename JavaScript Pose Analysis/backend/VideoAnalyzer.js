import DataAnalyzer from './DataAnalyzer.js';
import fs from 'fs/promises';
import path from 'path';
// import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { loadImage, createCanvas, Image, ImageData, Canvas } from 'canvas';
import { GoogleGenerativeAI } from "@google/generative-ai";

const require = createRequire(import.meta.url);
const movementCriteria = require('./movement_criteria.json');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Polyfills for Canvas (needed for drawPoints)
global.HTMLImageElement = Image;
global.ImageData = ImageData;
global.HTMLCanvasElement = Canvas;

ffmpeg.setFfmpegPath(ffmpegPath);

export const PoseLandmark = {
    NOSE: 0,
    LEFT_EYE_INNER: 1, LEFT_EYE: 2, LEFT_EYE_OUTER: 3,
    RIGHT_EYE_INNER: 4, RIGHT_EYE: 5, RIGHT_EYE_OUTER: 6,
    LEFT_EAR: 7, RIGHT_EAR: 8,
    MOUTH_LEFT: 9, MOUTH_RIGHT: 10,
    LEFT_SHOULDER: 11, RIGHT_SHOULDER: 12,
    LEFT_ELBOW: 13, RIGHT_ELBOW: 14,
    LEFT_WRIST: 15, RIGHT_WRIST: 16,
    LEFT_PINKY: 17, RIGHT_PINKY: 18,
    LEFT_INDEX: 19, RIGHT_INDEX: 20,
    LEFT_THUMB: 21, RIGHT_THUMB: 22,
    LEFT_HIP: 23, RIGHT_HIP: 24,
    LEFT_KNEE: 25, RIGHT_KNEE: 26,
    LEFT_ANKLE: 27, RIGHT_ANKLE: 28,
    LEFT_HEEL: 29, RIGHT_HEEL: 30,
    LEFT_FOOT_INDEX: 31, RIGHT_FOOT_INDEX: 32
};

const m_inf_threshold = 100;

export default class VideoAnalyzer extends DataAnalyzer {
    constructor(videoPath, framesCutPerSecond, width, height) {
        super();
        this.videoPath = videoPath;
        this.framesCutPs = framesCutPerSecond;
        this.width = width;
        this.height = height;
        this.sequencePath = null;
        this.analyzedImagesPath = [];
        this.detector = null;
        this.criteriaData = movementCriteria;
    }

    async initialize() {
        console.log("Analyzer initialized (Frame Extraction Mode - No AI)");
    }

    async splitFrames() {
        const filename = path.basename(this.videoPath, path.extname(this.videoPath));
        // Create a temp directory for frames
        this.sequencePath = path.join(__dirname, 'temp', `images_${filename}`);

        try {
            await fs.rm(this.sequencePath, { recursive: true, force: true });
            await fs.mkdir(this.sequencePath, { recursive: true });
        } catch (err) {
            console.error("Error creating directory:", err);
        }

        console.log(`Frames extraction logic initiated for ${filename} to ${this.sequencePath}`);

        return new Promise((resolve, reject) => {
            console.log("[DEBUG] Spawning ffmpeg...");
            ffmpeg(this.videoPath)
                .outputOptions(`-r ${this.framesCutPs}`)
                .outputOptions('-y') // Force overwrite of existing files
                .outputOptions('-start_number 0') // Match Python 0-indexed frames
                .output(path.join(this.sequencePath, '%d.jpg'))
                .on('end', () => {
                    console.log('Frames extracted successfully');
                    resolve();
                })
                .on('error', (err) => {
                    console.error('Error extracting frames:', err);
                    reject(err);
                })
                .run();
        });
    }

    async findKeyTime(movementType) {
        const angles = {};
        const imagePerFrame = {};

        if (!this.sequencePath) return [];

        // Read directory
        const files = await fs.readdir(this.sequencePath);
        const framesSorted = files
            .filter(f => f.endsWith('.jpg') && !isNaN(f.replace('.jpg', '')))
            .sort((a, b) => parseInt(a) - parseInt(b));

        console.log("Frames:", framesSorted);

        for (let i = 0; i < framesSorted.length; i++) {
            const photoName = framesSorted[i];
            const photoUri = path.join(this.sequencePath, photoName);
            
            const actionJoints = this.criteriaData[movementType]?.action_joints;
            const analysis = await this.analyzePhoto(photoUri, actionJoints);

            if (!analysis) continue;

            const [angle, , ] = analysis; // Destructuring tuple
            angles[i] = angle;
            imagePerFrame[i] = photoName;
        }

        const frameIds = this.getCandidateFrames(angles);
        console.log("Candidate Frames:", frameIds);
        
        return frameIds ? frameIds.map(id => imagePerFrame[id]) : [];
    }

    
    async analyzePhoto(photoUri, actionJoints = null, sensitivity = 0.5) {
        // MOCKING detection result to avoid MediaPipe dependency
        
        const filename = path.basename(photoUri);
        const frameNum = parseInt(filename.replace('.jpg', '')) || 0;
        // Simulate a squat cycle over 30 frames (0 = standing, 15 = bottom, 30 = standing)
        const cyclePos = (frameNum % 30) / 15.0; 
        const squatDepth = cyclePos <= 1 ? cyclePos : 2 - cyclePos; // 0 to 1 (1 is deepest)
        // const yOffset = squatDepth * 0.2; // Disabled to ensure consistent "Good Form" for testing
        const yOffset = 0;

        // Injecting a "Good Squat" pose (Side View) for testing
        const mockLandmarks = [];
        for(let i=0; i<33; i++) mockLandmarks.push({x:0, y:0, visibility:0});
        
        // Simulate Side Squat (Facing Right) - Biomechanically Correct "Parallel Squat"
        // Torso Slope: (0.5, 0.2) -> (0.3, 0.5) => m = -1.5
        // Shin Slope:  (0.6, 0.6) -> (0.4, 0.9) => m = -1.5 (Parallel to Torso)
        mockLandmarks[PoseLandmark.RIGHT_SHOULDER] = { x: 0.5, y: 0.2, visibility: 0.9 }; 
        mockLandmarks[PoseLandmark.RIGHT_HIP] = { x: 0.4, y: 0.6 + yOffset, visibility: 0.9 };
        mockLandmarks[PoseLandmark.RIGHT_HIP] = { x: 0.3, y: 0.5 + yOffset, visibility: 0.9 };
        mockLandmarks[PoseLandmark.RIGHT_KNEE] = { x: 0.6, y: 0.6 + yOffset, visibility: 0.9 }; 
        mockLandmarks[PoseLandmark.RIGHT_ANKLE] = { x: 0.4, y: 0.9, visibility: 0.9 };
        mockLandmarks[PoseLandmark.RIGHT_HEEL] = { x: 0.38, y: 0.9, visibility: 0.9 };
        mockLandmarks[PoseLandmark.RIGHT_FOOT_INDEX] = { x: 0.55, y: 0.9, visibility: 0.9 };
        mockLandmarks[PoseLandmark.RIGHT_EAR] = { x: 0.5, y: 0.1, visibility: 0.9 };
        mockLandmarks[PoseLandmark.RIGHT_MOUTH] = { x: 0.5, y: 0.15, visibility: 0.9 };
        
        // Mirror to Left side to prevent missing landmark errors
        mockLandmarks[PoseLandmark.LEFT_SHOULDER] = { x: 0.5, y: 0.2, visibility: 0.9 };
        mockLandmarks[PoseLandmark.LEFT_HIP] = { x: 0.3, y: 0.5 + yOffset, visibility: 0.9 };
        mockLandmarks[PoseLandmark.LEFT_KNEE] = { x: 0.6, y: 0.6 + yOffset, visibility: 0.9 };
        mockLandmarks[PoseLandmark.LEFT_ANKLE] = { x: 0.4, y: 0.9, visibility: 0.9 };
        mockLandmarks[PoseLandmark.LEFT_HEEL] = { x: 0.38, y: 0.9, visibility: 0.9 };
        mockLandmarks[PoseLandmark.LEFT_FOOT_INDEX] = { x: 0.55, y: 0.9, visibility: 0.9 };
        mockLandmarks[PoseLandmark.LEFT_EAR] = { x: 0.5, y: 0.1, visibility: 0.9 };
        mockLandmarks[PoseLandmark.LEFT_MOUTH] = { x: 0.5, y: 0.15, visibility: 0.9 };

        const detectionResult = { landmarks: [ mockLandmarks ] };
        const poseLandmarksList = detectionResult.landmarks[0];
        const connections = {};

        poseLandmarksList.forEach((landmark, idx) => {
            if ((landmark.visibility || 1) > sensitivity) {
                connections[idx] = landmark;
            }
        });

        if (!actionJoints) return connections;

        let lAngle = null;
        let rAngle = null;

        let index = 0;
        for (const [key, joints] of Object.entries(actionJoints)) {
            const actionJointId = PoseLandmark[key];
            const adjJoint1Id = PoseLandmark[joints[0]];
            const adjJoint2Id = PoseLandmark[joints[1]];

            const actionJoint = connections[actionJointId];
            const adjJoint1 = connections[adjJoint1Id];
            const adjJoint2 = connections[adjJoint2Id];

            if (!actionJoint || !adjJoint1 || !adjJoint2) continue;

            const angle = this.getAngle(actionJoint, adjJoint1, adjJoint2);
            
            if (index === 0) lAngle = angle;
            else rAngle = angle;
            index++;
        }

        return [lAngle, rAngle, connections];
    }

    getCandidateFrames(angles) {
        const candidateFrames = [];
        const labels = Object.keys(angles).map(Number);
        const values = Object.values(angles);

        if (values.length === 0) return null;

        const sineFit = this.fitSin(labels, values);
        const angleThresh = sineFit.offset - Math.abs(sineFit.amp);

        const minValues = values.filter(v => v <= angleThresh);
        const targetValues = minValues.length > 0 ? minValues : [Math.min(...values)];

        let minKey = -1;
        let prevFrame = 0;
        let currentMin = Infinity;

        for (const [k, v] of Object.entries(angles)) {
            const frameNum = parseInt(k);
            if (!targetValues.includes(v)) continue;

            if (frameNum - 1 !== prevFrame) {
                if (minKey !== -1) candidateFrames.push(minKey);
                else if (candidateFrames.length >= 0) candidateFrames.push(frameNum);

                minKey = -1;
                currentMin = Infinity;
            } else {
                if (v < currentMin) {
                    currentMin = v;
                    minKey = frameNum;
                }
            }
            prevFrame = frameNum;
        }

        return candidateFrames.length > 0 ? candidateFrames : null;
    }

    async analyzeBottomPosition(imagePath, movementType) {
        const analysis = await this.analyzePhoto(imagePath, null, 0.5);
        const connections = analysis; 

        if (!connections) return {};

        // Draw points (creates a new image file with overlay)
        const analyzedPath = await this.drawPoints(imagePath, connections);
        this.analyzedImagesPath.push(analyzedPath);

        const leftRequired = [];
        const rightRequired = [];
        const actionJoints = this.criteriaData[movementType].action_joints;

        for (const key in actionJoints) {
            if (key.includes("LEFT")) {
                leftRequired.push(key);
                leftRequired.push(...actionJoints[key]);
            } else {
                rightRequired.push(key);
                rightRequired.push(...actionJoints[key]);
            }
        }

        const profile = this.determineProfile(connections, leftRequired, rightRequired);
        const scorePerCondition = {};
        let criteriaSubset = {};

        if (profile === "side") {
            criteriaSubset = this.criteriaData[movementType].assessment_side;
        } else if (profile === "front") {
            criteriaSubset = this.criteriaData[movementType].assessment_front;
        }

        const assessmentItems = [];
        Object.values(criteriaSubset).forEach(section => {
            Object.entries(section).forEach(([k, v]) => assessmentItems.push({ key: k, ...v }));
        });

        for (const item of assessmentItems) {
            const targetSlope = item.m;
            const assessmentType = item.assessment_type;
            
            const score = this.getScore(connections, item.joints, targetSlope, assessmentType, profile);
            if (score !== null) {
                scorePerCondition[item.key] = score;
            }
        }

        const validScores = Object.values(scorePerCondition).filter(s => s > 0 && s < 100);
        let overallRating = 0;
        if (validScores.length > 0) {
            const avgDeviation = validScores.reduce((a, b) => a + b, 0) / validScores.length;
            overallRating = Math.max(0, 100 - avgDeviation);
        } else if (Object.keys(scorePerCondition).length > 0 && Object.values(scorePerCondition).every(s => s === 0)) {
            overallRating = 100;
        }

        scorePerCondition["OVERALL_RATING"] = overallRating;
        const mainProblems = Object.keys(scorePerCondition).filter(k => scorePerCondition[k] > 40 && k !== "OVERALL_RATING");
        scorePerCondition["MAIN_PROBLEMS"] = mainProblems;

        // Return the filename of the labeled image so frontend can display it
        scorePerCondition["labeled_image_name"] = path.basename(analyzedPath);

        return scorePerCondition;
    }

    determineProfile(connections, reqLeft, reqRight, deltaXThresh = 0.075) {
        const allReq = [...reqLeft, ...reqRight];
        const present = allReq.filter(lm => connections[PoseLandmark[lm]]);
        if (present.length !== allReq.length) return "side";

        const deltaXs = [];
        for (let i = 0; i < reqLeft.length; i++) {
            const lKey = PoseLandmark[reqLeft[i]];
            const rKey = PoseLandmark[reqRight[i]];
            
            if (connections[lKey] && connections[rKey]) {
                const delta = Math.abs(Math.abs(connections[lKey].x) - Math.abs(connections[rKey].x));
                deltaXs.push(delta);
            }
        }

        if (deltaXs.length === 0) return "side";
        const avg = deltaXs.reduce((a, b) => a + b, 0) / deltaXs.length;
        return avg <= deltaXThresh ? "side" : "front";
    }

    addSidePrefix(joints) {
        const left = [];
        const right = [];
        joints.forEach(j => {
            if (j === "MOUTH") {
                left.push(j + "_LEFT");
                right.push(j + "_RIGHT");
            } else {
                left.push("LEFT_" + j);
                right.push("RIGHT_" + j);
            }
        });
        return [left, right];
    }

    getScore(connections, analyzedJoints, targetSlope, assessmentType, profile) {
        const scores = [];
        const getP = (name) => connections[PoseLandmark[name]];

        if (assessmentType === "line" || assessmentType === "min_line" || assessmentType === "max_line") {
            let jointPairsToAnalyze = [];
            if (profile === "side") {
                if (!Array.isArray(analyzedJoints)) return null; // Safety check
                analyzedJoints.forEach(pair => {
                    const [l, r] = this.addSidePrefix(pair);
                    jointPairsToAnalyze.push(l);
                    jointPairsToAnalyze.push(r);
                });
            } else {
                jointPairsToAnalyze = analyzedJoints;
            }

            for (const pair of jointPairsToAnalyze) {
                const p1 = getP(pair[0]);
                const p2 = getP(pair[1]);
                if (!p1 || !p2) continue;

                const slope = this.getSlope(p1, p2, m_inf_threshold);
                
                if (assessmentType === "line") {
                    if (slope === 'inf') scores.push(this.getPercentDiff(slope, targetSlope));
                    else scores.push(this.getPercentDiff(Math.abs(slope), targetSlope));
                } else {
                    let passed = false;
                    if (slope !== 'inf') {
                        if (assessmentType === "min_line" && slope >= targetSlope) passed = true;
                        if (assessmentType === "max_line" && slope <= targetSlope) passed = true;
                    }
                    if (passed) scores.push(0);
                    else {
                        if (slope === 'inf') scores.push(this.getPercentDiff(slope, targetSlope));
                        else scores.push(this.getPercentDiff(Math.abs(slope), Math.abs(targetSlope)));
                    }
                }
            }
        } else if (assessmentType === "parallel_lines") {
            const firstJoints = analyzedJoints.first_line;
            const secondJoints = analyzedJoints.second_line;

            const getSlopeOfPair = (pair) => {
                const p1 = getP(pair[0]);
                const p2 = getP(pair[1]);
                if (!p1 || !p2) return null;
                return this.getSlope(p1, p2, m_inf_threshold);
            };

            for (const joints1 of firstJoints) {
                for (const joints2 of secondJoints) {
                    let sL1 = null, sL2 = null, sR1 = null, sR2 = null;

                    if (profile === "side") {
                        const [l1, r1] = this.addSidePrefix(joints1);
                        const [l2, r2] = this.addSidePrefix(joints2);
                        sL1 = getSlopeOfPair(l1);
                        sL2 = getSlopeOfPair(l2);
                        sR1 = getSlopeOfPair(r1);
                        sR2 = getSlopeOfPair(r2);
                    } else {
                        // Front profile: compare the two lines directly (e.g. left knee valgus vs right knee valgus)
                        sL1 = getSlopeOfPair(joints1);
                        sR1 = getSlopeOfPair(joints2);
                    }

                    if (targetSlope !== "None") {
                        if (sL1 !== null) scores.push(this.getPercentDiff(sL1 === 'inf' ? sL1 : Math.abs(sL1), targetSlope));
                        if (sR1 !== null) scores.push(this.getPercentDiff(sR1 === 'inf' ? sR1 : Math.abs(sR1), targetSlope));
                        if (profile === "side") {
                             if (sL2 !== null) scores.push(this.getPercentDiff(sL2 === 'inf' ? sL2 : Math.abs(sL2), targetSlope));
                             if (sR2 !== null) scores.push(this.getPercentDiff(sR2 === 'inf' ? sR2 : Math.abs(sR2), targetSlope));
                        }
                    } else {
                        // Compare parallelism (slope vs slope)
                        if (sL1 !== null && sL2 !== null) scores.push(this.getPercentDiff(sL1, sL2));
                        if (sR1 !== null && sR2 !== null) scores.push(this.getPercentDiff(sR1, sR2));
                    }
                }
            }
        }
        
        if (scores.length === 0) return null;
        return Math.min(...scores.map(Math.abs));
    }

    async drawPoints(imagePath, connections) {
        const image = await loadImage(imagePath);
        const canvas = createCanvas(image.width, image.height);
        const ctx = canvas.getContext('2d');
        
        // Draw original image
        ctx.drawImage(image, 0, 0);
        
        // Draw landmarks
        ctx.fillStyle = 'red';
        for (const key in connections) {
            const lm = connections[key];
            const x = lm.x * image.width;
            const y = lm.y * image.height;
            
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, 2 * Math.PI);
            ctx.fill();
        }

        const outPath = imagePath.replace('.jpg', '_labeled.jpg');
        const buffer = canvas.toBuffer('image/jpeg');
        await fs.writeFile(outPath, buffer);
        
        return outPath;
    }

    generateFeedback(scores) {
        const report = [];
        let totalScore = 0;

        // Add Title
        report.push({ Category: "Exercise", "Notes from the Frames": "Squat", "Rating (out of 100)": "" });

        // Adjusted rating: 3% deviation = 1 point deduction (out of 20)
        const getRating = (deviation) => Math.max(0, Math.round(20 - (deviation / 3)));
        
        // 1. Head/Neck Position
        const headDev = scores.head_position || 0;
        const headRating = getRating(headDev);
        let headNote = "Neutral head position.";
        if (headDev > 10) headNote = "Slight forward head posture / not fully neutral.";
        if (headDev > 30) headNote = "Significant forward head lean.";
        report.push({ Category: "Head/Neck Position", "Notes from the Frames": headNote, "Rating (out of 100)": `${headRating}/20` });
        totalScore += headRating;

        // 2. Torso & Back Angle
        const thoracic = scores.thoracic_position || 0;
        const trunk = scores.trunk_position || 0;
        const torsoDev = (thoracic + trunk) / 2;
        const torsoRating = getRating(torsoDev);
        let torsoNote = "Good torso alignment.";
        if (torsoDev > 10) torsoNote = "Noticeable forward torso lean, some rounding.";
        if (torsoDev > 30) torsoNote = "Significant rounding of the back.";
        report.push({ Category: "Torso & Back Angle", "Notes from the Frames": torsoNote, "Rating (out of 100)": `${torsoRating}/20` });
        totalScore += torsoRating;

        // 3. Hip/Knee Coordination
        const kneeDev = scores.tibial_progression_angle || 0;
        const kneeRating = getRating(kneeDev);
        let kneeNote = "Good knee tracking.";
        if (kneeDev > 10) kneeNote = "Knees generally tracking forward, sometimes too forward.";
        if (kneeDev > 30) kneeNote = "Excessive forward knee travel.";
        report.push({ Category: "Hip/Knee Coordination", "Notes from the Frames": kneeNote, "Rating (out of 100)": `${kneeRating}/20` });
        totalScore += kneeRating;

        // 4. Depth
        const depthDev = scores.depth || 0;
        const depthRating = getRating(depthDev);
        let depthNote = "Good depth achieved.";
        if (depthDev > 10) depthNote = "Achieves around parallel but not consistently below.";
        if (depthDev > 30) depthNote = "Depth significantly above parallel.";
        report.push({ Category: "Depth", "Notes from the Frames": depthNote, "Rating (out of 100)": `${depthRating}/20` });
        totalScore += depthRating;

        // 5. Feet/Ankle Position
        const footDev = scores.foot_position || 0;
        const footRating = getRating(footDev);
        let footNote = "Looks stable, heel stays mostly down.";
        if (footDev > 10) footNote = "Heels slightly rising.";
        if (footDev > 30) footNote = "Significant heel rise / instability.";
        report.push({ Category: "Feet/Ankle Position", "Notes from the Frames": footNote, "Rating (out of 100)": `${footRating}/20` });
        totalScore += footRating;

        // Overall
        report.push({ Category: "Overall Score", "Notes from the Frames": "Sum of all ratings", "Rating (out of 100)": `${totalScore}/100` });

        return report;
    }

    async analyzeWithGemini(apiKey) {
        if (!apiKey) {
            throw new Error("API Key is required for Gemini analysis");
        }

        // Ensure frames are extracted first
        console.log("[GEMINI] Extracting frames for analysis...");
        await this.splitFrames();

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        // Read frames from the sequence path
        const files = await fs.readdir(this.sequencePath);
        const framesSorted = files
            .filter(f => f.endsWith('.jpg') && !isNaN(f.replace('.jpg', '')))
            .sort((a, b) => parseInt(a) - parseInt(b));

        console.log(`[GEMINI] Analyzing ${framesSorted.length} frames...`);

        const imageParts = await Promise.all(framesSorted.map(async (frame) => {
            const filePath = path.join(this.sequencePath, frame);
            const buffer = await fs.readFile(filePath);
            return {
                inlineData: {
                    data: buffer.toString("base64"),
                    mimeType: "image/jpeg"
                }
            };
        }));

        console.log("[GEMINI] Generating analysis...");
        const prompt = `
        Act as a strict professional strength and conditioning coach (NSCA/CSCS standard). Analyze this video of a squat motion.
        Use professional biomechanics resources as a reference for perfect form. Be tough but reasonable; deduct points for deviations.

        1. **Camera Angle**: Determine if the person is facing the camera (front), sideways (side), or at an angle.
        2. **Overall Rating**: Rate the squat strictly out of 100. Deduct points for issues like depth (must break parallel), knee valgus, or lumbar flexion.
        3. **Detailed Evaluation**: For each body part, provide a strict rating out of 100 and a critical comment citing specific biomechanical faults or good execution:
           - Head Position (Neutral spine?)
           - Torso/Back (Neutral spine? Excessive lean?)
           - Shoulders/Arms (Tightness/Engagement?)
           - Knees (Tracking over toes? Valgus? Depth?)
           - Feet (Heels flat? Stability?)
        4. **Overall Comment**: Provide a summary critique with specific cues for improvement.

        Return the response in valid JSON format with the following keys:
        {
            "camera_angle": "string",
            "overall_rating": number,
            "overall_comment": "string",
            "detailed_ratings": {
                "head_position": { "rating": number, "comment": "string" },
                "torso_back": { "rating": number, "comment": "string" },
                "shoulders_arms": { "rating": number, "comment": "string" },
                "knees": { "rating": number, "comment": "string" },
                "feet": { "rating": number, "comment": "string" }
            }
        }`;

        const result = await model.generateContent([
            ...imageParts,
            { text: prompt }
        ]);

        const responseText = result.response.text();
        // Clean up markdown code blocks if present
        const jsonString = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonString);
    }
}
