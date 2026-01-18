import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View, Text, SafeAreaView, Alert } from "react-native";
import { WebView } from "react-native-webview";
import { Camera, useCameraPermissions } from "expo-camera"; // Just for permission requesting
import { Double } from "react-native/Libraries/Types/CodegenTypes";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import { useNavigation } from "@react-navigation/native";

// This is the HTML/JS code that runs INSIDE the hidden browser
// Stolen and converted from https://codepen.io/mediapipe-preview/pen/abRLMxN
const MEDIAPIPE_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
  <style>
    body {
      margin: 0;
      padding: 0;
      overflow: hidden;
      background: black;
    }
    .container {
      position: relative;
      width: 100vw;
      height: 100vh;
    }
    video, canvas {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    #status {
      position: absolute;
      top: 20px;
      left: 20px;
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
  </div>

  <script type="module">
    // --- ADD THIS LOGGING BRIDGE ---
    const originalLog = console.log;
    const originalError = console.error;

    console.log = (...args) => {
      originalLog(...args); // still log internally
      // Send to React Native
      window.ReactNativeWebView.postMessage(JSON.stringify({ 
        type: 'CONSOLE_LOG', 
        data: args.map(a => String(a)).join(' ') 
      }));
    };

    console.error = (...args) => {
      originalError(...args);
      window.ReactNativeWebView.postMessage(JSON.stringify({ 
        type: 'CONSOLE_ERROR', 
        data: args.map(a => String(a)).join(' ') 
      }));
    };

    import {
      PoseLandmarker,
      FilesetResolver,
      DrawingUtils
    } from "https://cdn.skypack.dev/@mediapipe/tasks-vision@0.10.0";

    const video = document.getElementById("webcam");
    const canvas = document.getElementById("output_canvas");
    const ctx = canvas.getContext("2d");
    const status = document.getElementById("status");

    let poseLandmarker;
    let running = false;
    let mediaRecorder;     // <--- NEW: Recorder variable
    let recordedChunks = []; // <--- NEW: Buffer for video data
    let lastVideoTime = -1;

    // --- NEW: LISTEN FOR COMMANDS FROM REACT NATIVE ---
    // We listen for "START_RECORD" and "STOP_RECORD"
    document.addEventListener("message", (event) => {
      handleRNMessage(event);
    });
    window.addEventListener("message", (event) => {
      handleRNMessage(event);
    });

    function handleRNMessage(event) {
        try {
            const message = JSON.parse(event.data);
            if (message.type === "START_RECORD") startRecording();
            if (message.type === "STOP_RECORD") stopRecording();
        } catch(e) { console.log(e) }
    }

    // --- NEW: RECORDING FUNCTIONS ---
    function startRecording() {
        if (!video.srcObject) return;
        
        // Create recorder if it doesn't exist
        // Note: mimeType 'video/webm' is standard for web. 
        // We can convert to mp4 on backend if needed.
        const options = { mimeType: "video/webm" };
        mediaRecorder = new MediaRecorder(video.srcObject, options);

        recordedChunks = [];
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: "video/webm" });
            const reader = new FileReader();
            reader.readAsDataURL(blob); 
            reader.onloadend = () => {
                const base64data = reader.result;
                // Send the Base64 video string back to RN
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: "VIDEO_RESULT",
                    data: base64data
                }));
            };
        };

        mediaRecorder.start();
        console.log("Recording started...");
    }

    function stopRecording() {
        if (mediaRecorder && mediaRecorder.state !== "inactive") {
            mediaRecorder.stop();
            console.log("Recording stopped...");
        }
    }

    function log(msg) {
      status.innerText = msg;
    }

    async function init() {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
      );

      poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task",
          delegate: "CPU"
        },
        runningMode: "VIDEO",
        numPoses: 1
      });
      startCamera();
    }

    async function startCamera() {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { 
            facingMode: "environment",
            // Add these two lines to request a tall video feed
            width: { ideal: 1080 },
            height: { ideal: 1920 }
            }
        });

      video.srcObject = stream;
      video.addEventListener("loadeddata", () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        running = true;
        requestAnimationFrame(loop);
      });
    }

    function loop() {
      if (!running) return;

      if (video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;

        const now = performance.now();
        const result = poseLandmarker.detectForVideo(video, now);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (result.landmarks && result.landmarks.length > 0) {
          // const drawingUtils = new DrawingUtils(ctx);

          // for (const landmarks of result.landmarks) {
          //   drawingUtils.drawLandmarks(landmarks, { radius: 4 });
          //   drawingUtils.drawConnectors(
          //     landmarks,
          //     PoseLandmarker.POSE_CONNECTIONS
          //   );
          // }

          // Send landmarks to React Native
          window.ReactNativeWebView.postMessage(
            JSON.stringify({
              type: "pose",
              data: result.landmarks[0]
            })
          );
        }
      }

      requestAnimationFrame(loop);
    }

    init();
  </script>
</body>
</html>
`;

const CountdownTimer = ({ initialValue, onFinish }: any) => {
  const [timerCount, setTimer] = useState(initialValue || 60);

  useEffect(() => {
    // Start an interval that decrements the timer count every second
    let interval = setInterval(() => {
      setTimer((lastTimerCount: any) => {
        if (lastTimerCount <= 1) {
          // Clear the interval when the timer reaches 0 or less
          clearInterval(interval);
          onFinish?.();
          return 0;
        }
        return lastTimerCount - 1;
      });
    }, 1000); // 1000 milliseconds = 1 second

    // Cleanup function to clear the interval when the component unmounts
    return () => clearInterval(interval);
  }, []); // The empty dependency array ensures the effect runs only once on mount

  if (timerCount <= 0) return null;

  return (
    <View
      style={{
        justifyContent: "center",
        alignSelf: "center",
        flex: 1,
        position: "absolute",
        top: 0,
        bottom: 0,
      }}
    >
      <Text
        style={{
          color: "white",
          fontSize: 36,
          fontWeight: "bold",
          alignSelf: "center",
        }}
      >
        GET INTO POSITION!!
      </Text>
      <Text
        style={{
          color: "white",
          fontSize: 24,
          fontWeight: "bold",
          alignSelf: "center",
        }}
      >
        {timerCount}
      </Text>
    </View>
  );
};

const getAverage = (array: any[]) => {
  console.log(`A: ${array}`);
  if (array.length === 0) return 0; // Prevents division by zero for empty arrays

  let len = array.length;
  let s = 0;
  array.forEach((element) => {
    if (element == undefined || element == null) {
      len -= 1;
    } else {
      s += element;
    }
  });
  return s / len;
};

function WebviewTest({ navigation }: { navigation: any }) {
  const webviewRef = useRef<WebView>(null);
  const [poseData, setPoseData] = useState<any>(null);
  const prevAngleRef = useRef<any | null>(null);
  const [repInProgress, setRepInProgress] = useState<Boolean>(false);
  const [repCount, setRepCount] = useState(0);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] =
    MediaLibrary.usePermissions(); // <--- ADD THIS
  const allScores = useRef<any[]>([]);

  const LEFT_HIP = 23;
  const LEFT_KNEE = 25;
  const LEFT_ANKLE = 27;
  const RIGHT_HIP = 24;
  const RIGHT_KNEE = 26;
  const RIGHT_ANKLE = 28;
  const max_num_reps = 3;

  // Handle data coming FROM the WebView
  const handleMessage = async (event: any) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);

      // Case A: Pose Data
      if (message.type === "pose") {
        setPoseData(message.data);
      }
      // Case B: Video Data (The new part)
      else if (message.type === "VIDEO_RESULT") {
        console.log("Receiving video data...");
        console.log("VIDEO RECEIVED, length:", message.data.length);

        const filename = await uploadVideo(message.data);
        analyzeVideo(filename);
      }
      // Case C: Console Logs (The debug part)
      else if (message.type === "CONSOLE_LOG") {
        console.log("webview 🟢:", message.data);
      } else if (message.type === "CONSOLE_ERROR") {
        console.error("webview 🔴:", message.data);
      }
    } catch (e) {
      console.error("JSON Error", e);
    }
  };

  // Find angle
  const findAngle = ({ jointA, jointB, jointC }: any) => {
    const BA = {
      x: jointA.x - jointB.x,
      y: jointA.y - jointB.y,
      z: jointA.z - jointB.z,
    };

    const BC = {
      x: jointC.x - jointB.x,
      y: jointC.y - jointB.y,
      z: jointC.z - jointB.z,
    };

    const dot = BA.x * BC.x + BA.y * BC.y + BA.z * BC.z;

    const magBA = Math.sqrt(BA.x ** 2 + BA.y ** 2 + BA.z ** 2);
    const magBC = Math.sqrt(BC.x ** 2 + BC.y ** 2 + BC.z ** 2);

    const cos = dot / (magBA * magBC);
    const clamp = Math.max(-1, Math.min(1, cos));
    return Math.acos(clamp) * (180 / Math.PI);
  };

  const uploadVideo = async (fileUri: string) => {
    try {
      const formData = new FormData();
      formData.append("video", {
        uri: fileUri,
        name: "rep_video.webm",
        type: "video/webm",
      } as any);

      const response = await fetch("http://10.198.84.175:3000/upload", {
        method: "POST",
        body: formData,
        headers: { Accept: "application/json" },
      });

      const json = await response.json();
      console.log(json.filename);

      // CRITICAL: Return the filename so we can use it next
      return json.filename;
    } catch (error) {
      console.error("Upload failed:", error);
      return null;
    }
  };

  // 2. Create the Analysis function
  const analyzeVideo = async (filename: string) => {
    try {
      console.log(`🤖 Requesting analysis for: ${filename}`);

      // Pass the filename dynamically here
      const response = await fetch(
        `http://10.198.84.175:3000/analyze-gemini?filename=${filename}`,
      );

      const data = await response.json();
      console.log("Analysis Results:", data);

      if (data.analysis == undefined || data.analysis == null) {
        allScores.current.push(null);
      } else {
        allScores.current.push(data.analysis.overall_rating);
      }
      console.log(allScores.current);
    } catch (error) {
      console.error("Analysis failed:", error);
    }
  };

  useEffect(() => {
    if (!poseData || !isMeasuring) return;

    // 2. Extract the specific joint objects from the array
    const hip = poseData[LEFT_HIP]; // Index 23
    const knee = poseData[LEFT_KNEE]; // Index 25
    const ankle = poseData[LEFT_ANKLE]; // Index 27

    // 3. Safety Check: Ensure all three joints were actually detected
    // (Sometimes a foot might be off-screen)
    if (hip && knee && ankle) {
      const currentAngle = findAngle({
        jointA: hip,
        jointB: knee,
        jointC: ankle,
      });

      if (repInProgress && currentAngle > 165) {
        prevAngleRef.current = currentAngle;
        setRepInProgress(false);
        setRepCount(repCount + 1);

        // Get end video time, and encode
        setTimeout(() => {
          webviewRef.current?.postMessage(
            JSON.stringify({ type: "STOP_RECORD" }),
          );
        }, 200);
      }

      if (prevAngleRef.current == null && !repInProgress) {
        prevAngleRef.current = currentAngle;
      }

      // Check delta theta
      const dT = prevAngleRef.current - currentAngle;

      if (dT >= 10 && dT < 75 && !repInProgress) {
        prevAngleRef.current = currentAngle;
        setRepInProgress(true);
        // Get current video time
        webviewRef.current?.postMessage(
          JSON.stringify({ type: "START_RECORD" }),
        );
      }
    }
  }, [poseData, isMeasuring]);

  useEffect(() => {
    if (allScores.current.length >= max_num_reps) {
      navigation.navigate("Results");
    }
  }, [repCount, allScores]);

  if (!permission?.granted) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text
          onPress={requestPermission}
          style={{ padding: 20, color: "blue" }}
        >
          Click to Grant Camera Permission
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* The "Camera" is actually just a web browser showing a webpage */}
      <WebView
        ref={webviewRef}
        style={styles.webview}
        source={{ html: MEDIAPIPE_HTML, baseUrl: "https://localhost/" }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback={true}
        originWhitelist={["*"]}
        onMessage={handleMessage}
        // Android Permission Magic
        androidLayerType="hardware"
        mixedContentMode="always"
        mediaCapturePermissionGrantType="grant"
      />
      <CountdownTimer
        initialValue={5}
        onFinish={() => {
          console.log("Timer finished!");
          setIsMeasuring(true);
        }}
      />
      <View style={styles.overlay}>
        <Text
          style={[
            styles.text,
            { fontSize: 24, fontWeight: "bold", alignSelf: "center" },
          ]}
        >
          {poseData ? "Body Detected!" : "Loading..."}
        </Text>
        {poseData ? (
          <Text style={styles.text}>
            Left Knee: {poseData[LEFT_KNEE].y.toFixed(2)} {"\n"}
            Reps done:{" "}
            {repCount >= max_num_reps ? "Done! Please wait..." : repCount}
          </Text>
        ) : (
          <Text>No Pose</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "black" },
  webview: { flex: 1, backgroundColor: "transparent" },
  overlay: {
    position: "absolute",
    top: 80,
    left: 30,
    backgroundColor: "rgba(0,0,0,0.7)",
    padding: 10,
    borderRadius: 8,
  },
  text: { color: "white", fontSize: 24 },
});

export default WebviewTest;
