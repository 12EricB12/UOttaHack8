//A Runnable Demo (I think)
import { createMatchSocket } from "./match/matchSocket.js";
import { startPosePipeline } from "./pose/posePipeline.js";

const serverUrl = "http://localhost:3000";
const baseUrl = serverUrl;
const exerciseId = "squat";
const playerId = "player_" + Math.random().toString(36).slice(2, 8);

let stopPipeline = null;

const match = createMatchSocket({
  serverUrl,
  playerId,
  handlers: {
    connected: (d) => {
      console.log("[client] connected:", d);
      match.queueJoin(exerciseId);
    },
    queueWaiting: (d) => console.log("[client] waiting:", d),
    matchFound: async (d) => {
      console.log("[client] match found:", d);

      if (stopPipeline) await stopPipeline();
      stopPipeline = await startPosePipeline({
        baseUrl,
        matchId: d.matchId,
        playerId,
        exerciseId,
        sendRepScoreToMatchServer: match.sendRepScore,
        onLocalUpdate: (info) => console.log("[client] local:", info)
      });
    },
    scoreboard: (d) => console.log("[client] scoreboard:", d),
    matchEnded: async (d) => {
      console.log("[client] ended:", d);

      if (stopPipeline) {
        await stopPipeline();
        stopPipeline = null;
      }
      // queue again after 2 seconds
      setTimeout(() => match.queueJoin(exerciseId), 2000);
    },
    matchError: (e) => console.log("[client] error:", e)
  }
});
