import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Button,
  Dimensions,
} from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import {
  Holistic,
  FACEMESH_TESSELATION,
  FACEMESH_RIGHT_EYE,
  FACEMESH_RIGHT_EYEBROW,
  FACEMESH_LEFT_EYE,
  FACEMESH_LEFT_EYEBROW,
  FACEMESH_FACE_OVAL,
  FACEMESH_LIPS,
  POSE_CONNECTIONS,
  POSE_LANDMARKS,
  POSE_LANDMARKS_LEFT,
  POSE_LANDMARKS_RIGHT,
  HAND_CONNECTIONS,
  Results,
  Options,
  NormalizedLandmarkList,
  NormalizedLandmark,
} from "@mediapipe/holistic";

// --- Screen 2: Workout / Camera Screen ---
function WorkoutScreen() {
  const callbacks = {
    onResults: (results: any) => {
      console.log("Pose detection results:", results);
    },
    onError: (error: any) => {
      console.error("Pose detection error:", error);
    },
  };
  const { hasPermission, requestPermission } = useCameraPermission();
  // Placeholder state for reps - easy to hook up to your backend later
  const [reps, setReps] = useState(0);
  const [landmarks, setLandmarks] = useState([]);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const device = useCameraDevice("front");

  if (hasPermission) {
    // Camera permissions are still loading
    return <View />;
  }

  // // --- 1. The Updater Function (Runs on JS Thread) ---
  // // We use this to update the UI state with the data from the Frame Processor
  // const updateLandmarks = useCallback((newLandmarks: any) => {
  //   setLandmarks(newLandmarks);
  // }, []);

  // const runOnJSUpdate = useRunOnJS(updateLandmarks, [updateLandmarks]);

  // // --- 2. The Frame Processor (Runs on UI/Background Thread) ---
  // const frameProcessor = useFrameProcessor(
  //   (frame) => {
  //     "worklet";

  //     // Throttle to 15 FPS for performance (React State is slow to update)
  //     runAtTargetFps(15, () => {
  //       // A. Call the detector plugin
  //       // Note: 'detectPose' is the hypothetical bridge function provided by the package
  //       const poseObject = detectPose(frame);

  //       // B. If a body is found, process the landmarks
  //       if (poseObject && poseObject.landmarks) {
  //         // C. Send data to JS Thread to draw
  //         runOnJSUpdate(poseObject.landmarks);
  //       } else {
  //         runOnJSUpdate([]);
  //       }
  //     });
  //   },
  //   [runOnJSUpdate],
  // );

  const poseDetection = usePoseDetection(
    callbacks,
    "LIVE_STREAM",
    "pose_model",
    {
      // numPoses: 1,
      // minPoseDetectionConfidence: 0.5,
      // minPosePresenceConfidence: 0.5,
      // minTrackingConfidence: 0.5,
      // shouldOutputSegmentationMasks: false,
      // delegate: 'GPU',
      // mirrorMode: 'mirror-front-only',
      // forceOutputOrientation: 'portrait',
      // forceCameraOrientation: 'portrait',
      // fpsMode: 30,
    },
  );

  return (
    <Camera
      style={{ flex: 1 }}
      device={poseDetection.cameraDevice}
      onLayout={poseDetection.cameraViewLayoutChangeHandler}
      frameProcessor={poseDetection.frameProcessor}
      frameProcessorFps={poseDetection.fpsMode}
    />
  );

  if (!hasPermission) {
    // Camera permissions are not granted yet
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: "center", marginBottom: 20 }}>
          We need your permission to show the camera
        </Text>
        <Button onPress={requestPermission} title="grant permission" />
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.container}>
        <Text>Loading Camera...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Background Camera */}
      <Camera
        style={{ flex: 1 }}
        device={device}
        onLayout={poseDetection.cameraViewLayoutChangeHandler}
        frameProcessor={poseDetection.frameProcessor}
        isActive={true}
      />
      {/* Top Overlay */}
      <View style={styles.topOverlay}>
        <Text style={styles.overlayText}>Current goal: 10 reps of BLANK</Text>
      </View>

      {/* Bottom Overlay */}
      <View style={styles.bottomOverlay}>
        <Text style={styles.overlayText}>You have completed {reps} reps</Text>
      </View>
    </View>
  );
}

// --- Styles ---
const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  // Camera Screen Overlays
  topOverlay: {
    position: "absolute",
    top: 60,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 10,
    borderRadius: 8,
  },
  bottomOverlay: {
    position: "absolute",
    bottom: 50,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 10,
    borderRadius: 8,
  },
  overlayText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
  },
});

export default WorkoutScreen;
