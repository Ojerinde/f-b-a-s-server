const { createServer } = require("https");
const WebSocket = require("ws");
const fs = require("fs");
require("dotenv").config();

const app = require("./app");
const connectToMongoDB = require("./db");
const {
  enrollStudentWithWebsocket,
  getEnrollFeedbackFromEsp32,
} = require("./handlers/enrollHandler");
const {
  takeAttendanceWithWebsocket,
  getAttendanceFeedbackFromEsp32,
} = require("./handlers/takeAttendanceHandler");
const {
  esp32DetailsWithWebsocket,
  esp32DetailsFeedback,
} = require("./handlers/esp32DetailsHandler");
const {
  clearFingerprintsWithWebsocket,
  clearFingerprintsFeedback,
} = require("./handlers/emptyFingerprintsHandler");
const {
  deleteFingerprintFeedback,
  deleteFingerprintWithWebsocket,
} = require("./handlers/deleteFingerprintHandler");
const PORT = 443;

const options = {
  key: fs.readFileSync(
    "/etc/letsencrypt/archive/api.envisionlixarchitects.com/privkey1.pem"
  ),
  cert: fs.readFileSync(
    "/etc/letsencrypt/archive/api.envisionlixarchitects.com/fullchain1.pem"
  ),
};

const httpsServer = createServer(options, app);

const clients = new Set();

// Initialize WebSocket server
const wss = new WebSocket.Server({ server: httpsServer, path: "/ws" });

// function heartbeat() {
//   this.isAlive = true;
// }

wss.on("connection", (ws) => {
  console.log("A client is connected");

  // ws.isAlive = true;
  // ws.on("pong", heartbeat);

  clients.add(ws);

  // Handle incoming messages
  ws.on("message", (message) => {
    const data = JSON.parse(message);
    console.log(`${data?.event} event received from client`);

    switch (data?.event) {
      case "enroll":
        enrollStudentWithWebsocket(ws, clients, data.payload);
        break;
      case "attendance":
        takeAttendanceWithWebsocket(ws, clients, data.payload);
        break;
      case "esp32_data":
        esp32DetailsWithWebsocket(ws, clients);
        break;
      case "clear_fingerprints":
        clearFingerprintsWithWebsocket(ws, clients, data.payload);
        break;
      case "delete_fingerprint":
        deleteFingerprintWithWebsocket(ws, clients, data.payload);
        break;

      // Feedback from ESP32 device
      case "enroll_response":
        getEnrollFeedbackFromEsp32(ws, clients, data.payload);
        break;
      case "attendance_response":
        getAttendanceFeedbackFromEsp32(ws, clients, data.payload);
        break;
      case "esp32_data_response":
        esp32DetailsFeedback(ws, clients, data.payload);
        break;
      case "empty_fingerprints_response":
        clearFingerprintsFeedback(ws, clients, data.payload);
        break;
      case "delete_fingerprint_response":
        deleteFingerprintFeedback(ws, clients, data.payload);
        break;
      // case "custom_pong":
      //   ws.isAlive = true; // Handle custom pong
      //   break;
      default:
        console.log("Unknown event:", data.event);
    }
  });

  ws.on("close", () => {
    console.log("A client disconnected");
    clients.delete(ws);
  });
});

// // Implement heartbeat mechanism
// const interval = setInterval(() => {
//   wss.clients.forEach((ws) => {
//     if (ws.isAlive === false) return ws.terminate();

//     ws.isAlive = false;
//     ws.send(JSON.stringify({ event: "custom_ping" }));
//   });
// }, 30000);

// wss.on("close", () => {
//   clearInterval(interval);
// });

connectToMongoDB()
  .then(() => {
    console.log("Connection to MongoDB is successful.");
    httpsServer.listen(PORT, () => {
      console.log("Secure websocket server running on port ->", PORT);
    });
  })
  .catch((error) => {
    console.log(
      error.message || error,
      "Connection to MongoDB was unsuccessful."
    );
  });
