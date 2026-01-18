import { createPoseTracker } from "./PoseTracker.SLOT.js";
import { createSquatRepDetector } from "./squatRepDetector.SLOT.js";
import { createRepRecorder } from "./repRecorder.js";
import { gradeRep } from "../api/gradingApi.js";

export async function startPosePipeline({
  baseUrl,
  matchId,
  playerId,
  exerciseId,
  sendRepScoreToMatchServer,
  onLocalUpdate
}) {
  const tracker = createPoseTracker();       // SLOT
  const detector = createSquatRepDetector(); // SLOT
  const recorder = createRepRecorder({ maxFrames: 10 });

  let repCount = 0;
  let recording = false;

  tracker.onPose(async (pose) => {
    // For real squat logic: start/stop recording based on state transitions.
    // For demo: always record frames when recording is true.
    if (recording) recorder.pushFrame(pose);

    const evt = detector.update(pose);
    if (!recording) {
      recording = true;
      recorder.startRep();
      recorder.pushFrame(pose);
    }

    if (evt?.type === "REP_COMPLETE") {
      recording = false;
      repCount = evt.repIndex + 1;

      const { repKeyframes, features } = recorder.endRep();
      onLocalUpdate?.({ repCount, pending: true });

      let graded;
      try {
        graded = await gradeRep({
          baseUrl,
          matchId,
          playerId,
          exerciseId,
          repIndex: evt.repIndex,
          repKeyframes,
          features
        });
      } catch (e) {
        onLocalUpdate?.({ repCount, pending: false, error: String(e) });
        return;
      }

      const repScore = graded.repScore;
      onLocalUpdate?.({ repCount, repScore, pending: false });

      sendRepScoreToMatchServer({ matchId, repIndex: evt.repIndex, repScore, repCount });

      // prepare next rep
      recording = true;
      recorder.startRep();
    }
  });

  await tracker.start();

  return async () => {
    await tracker.stop();
  };
}
