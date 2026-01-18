import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View, Text, SafeAreaView } from "react-native";
import { WebView } from "react-native-webview";
import { Camera, useCameraPermissions } from "expo-camera"; // permission requesting only

type WebviewTestProps = {
  onRepComplete?: (repIndex: number) => void;
  /**
   * If false, we still render the pose view but we do NOT count reps / emit events.
   * Useful for multiplayer: only enable after server match:start.
   */
  enabled?: boolean;
};

const MEDIAPIPE_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
  <style>
    body { margin: 0; padding: 0; overflow: hidden; background: black; }
    .container { position: relative; width: 100vw; height: 100vh; }
    video, canvas { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; }
    #status {
      position: absolute;
      top: 20px; left: 20px;
      z-index: 10;
      color: cyan;
      background: rgba(0,0,0,0.7);
      padding: 8px;
      font-family: monospace;
      font-size: 14px;
    }
  </style>
</head>

<body>
  <div class="container">
    <video id="webcam" autoplay muted playsinline></video>
    <canvas id="output_canvas"></canvas>
    <div id="status">Loading model...</div>
  </div>

  <script type="module">
    import { PoseLandmarker, FilesetResolver, DrawingUtils } from "https://cdn.skypack.dev/@mediapipe/tasks-vision@0.10.0";

    const video = document.getElementById("webcam");
    const canvas = document.getElementById("output_canvas");
    const ctx = canvas.getContext("2d");
    const status = document.getElementById("status");

    let poseLandmarker;
    let running = false;
    let lastVideoTime = -1;

    function log(msg) { status.innerText = msg; }

    async function init() {
      log("Loading WASM...");
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
      );

      log("Loading pose model...");
      poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task",
          delegate: "CPU"
        },
        runningMode: "VIDEO",
        numPoses: 1
      });

      log("Requesting camera...");
      startCamera();
    }

    async function startCamera() {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1080 },
          height: { ideal: 1920 }
        }
      });

      video.srcObject = stream;
      video.addEventListener("loadeddata", () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        running = true;
        log("Detecting pose...");
        requestAnimationFrame(loop);
      });
    }

    function loop() {
      if (!running) return;

      if (video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;

        const results = poseLandmarker.detectForVideo(video, performance.now());

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        if (results.landmarks && results.landmarks.length > 0) {
          // send landmarks up to RN
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: "pose",
            landmarks: results.landmarks[0]
          }));

          // optional drawing
          const drawingUtils = new DrawingUtils(ctx);
          drawingUtils.drawLandmarks(results.landmarks[0], { radius: 2 });
        }
      }

      requestAnimationFrame(loop);
    }

    init();
  </script>
</body>
</html>
`;

function angleBetween(a: any, b: any, c: any) {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const magAB = Math.sqrt(ab.x * ab.x + ab.y * ab.y);
  const magCB = Math.sqrt(cb.x * cb.x + cb.y * cb.y);
  const cosine = dot / (magAB * magCB + 1e-9);
  const angle = Math.acos(Math.min(1, Math.max(-1, cosine)));
  return (angle * 180) / Math.PI;
}

export default function WebviewTest({ onRepComplete, enabled = true }: WebviewTestProps) {
  const [permission, requestPermission] = useCameraPermissions();

  const [poseData, setPoseData] = useState<any>(null);

  // UI/debug
  const [repCountUI, setRepCountUI] = useState(0);
  const [repInProgress, setRepInProgress] = useState(false);
  const [status, setStatus] = useState("Waiting...");
  const [currentAngle, setCurrentAngle] = useState<number | null>(null);

  // IMPORTANT: authoritative rep index (0,1,2...) for multiplayer
  const repIndexRef = useRef(0);

  // thresholds
  const DOWN_ANGLE = 120; // <= this means "down"
  const UP_ANGLE = 165;   // >= this means "up / lockout"

  // Request permissions once
  useEffect(() => {
    (async () => {
      if (!permission?.granted) {
        await requestPermission();
      }
    })();
  }, [permission, requestPermission]);

  const onMessage = (event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === "pose") setPoseData(msg.landmarks);
    } catch {
      // ignore malformed
    }
  };

  useEffect(() => {
    if (!poseData) return;

    // If not enabled (e.g., waiting for match:start), don't count
    if (!enabled) {
      setStatus("Paused (waiting for match start)");
      return;
    }

    // Mediapipe pose landmark indices
    // 23 = left hip, 25 = left knee, 27 = left ankle
    const hip = poseData[23];
    const knee = poseData[25];
    const ankle = poseData[27];

    if (!hip || !knee || !ankle) return;

    const angle = angleBetween(hip, knee, ankle);
    setCurrentAngle(angle);

    // Detect squat start (going down)
    if (!repInProgress && angle < DOWN_ANGLE) {
      setRepInProgress(true);
      setStatus("Squat in progress...");
      return;
    }

    // Detect completion (back up)
    if (repInProgress && angle > UP_ANGLE) {
      setRepInProgress(false);

      // This rep gets the current index, then we increment
      const repIndex = repIndexRef.current;
      repIndexRef.current += 1;

      // Update UI count
      setRepCountUI((prev) => prev + 1);
      setStatus(`Rep ${repIndex + 1} completed ✅`);

      // Step 7 hook to multiplayer
      onRepComplete?.(repIndex);
    }
  }, [poseData, enabled, repInProgress, onRepComplete]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Hidden WebView running mediapipe */}
      <WebView
        style={styles.webview}
        source={{ html: MEDIAPIPE_HTML }}
        javaScriptEnabled
        onMessage={onMessage}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
      />

      {/* Overlay UI */}
      <View style={styles.overlay}>
        <Text style={styles.title}>Squat Detector</Text>
        <Text style={styles.text}>Enabled: {enabled ? "YES" : "NO"}</Text>
        <Text style={styles.text}>Status: {status}</Text>
        <Text style={styles.text}>Reps: {repCountUI}</Text>
        <Text style={styles.text}>
          Knee Angle: {currentAngle === null ? "-" : currentAngle.toFixed(1)}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "black" },
  webview: {
    flex: 1,
    opacity: 1, // keep visible; if you want hidden set to 0 and put your own camera view
  },
  overlay: {
    position: "absolute",
    top: 30,
    left: 12,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.65)",
    padding: 12,
    borderRadius: 14,
  },
  title: { color: "white", fontSize: 18, fontWeight: "800", marginBottom: 6 },
  text: { color: "white", marginTop: 4, fontWeight: "600" },
});
