const { createServer } = require("http");
const WebSocket = require("ws");
require("dotenv").config(); // Loads .env file contents into process.env.

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
const { DevicesConnected } = require("./models/appModel");

const PORT = 5000;

const httpServer = createServer(app);

// Initialize WebSocket server
const wss = new WebSocket.Server({ server: httpServer, path: "/ws" });

wss.on("connection", (ws) => {
  console.log("A client is connected");

  // Temporary property to store client type
  ws.clientType = null;
  ws.source = null;

  // Handle incoming messages
  ws.on("message", async (message) => {
    const data = JSON.parse(message);
    console.log(
      `${data?.event} event with ${data?.payload} received from client`
    );

    const clients = wss.clients;

    switch (data?.event) {
      case "identify":
        console.log(`Client identified as:`, data);
        ws.clientType = data.clientType.toLowerCase();
        ws.source = data.source.toLowerCase();

        if (data.source === "web_app" && data.clientType) {
        }

        if (data.source === "hardware" && data.clientType) {
          const existingDevice = await DevicesConnected.findOne({
            deviceLocation: data.clientType.toLowerCase(),
          });
          if (existingDevice) return;
          await DevicesConnected.create({
            deviceLocation: data.clientType.toLowerCase(),
          });
        }
        break;
      case "enroll":
        enrollStudentWithWebsocket(ws, clients, data.payload);
        break;
      case "attendance":
        takeAttendanceWithWebsocket(ws, clients, data.payload);
        break;
      case "esp32_data":
        esp32DetailsWithWebsocket(ws, clients, data.payload);
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
      default:
        console.log("Unknown event:", data.event);
    }
  });

  ws.on("close", () => {
    console.log("A client disconnected");
  });
});

connectToMongoDB()
  .then(() => {
    console.log("Connection to MongoDB is successful.");
    httpServer.listen(PORT, () => {
      console.log("Websocket Server running on port ->", PORT);
    });
  })
  .catch((error) => {
    console.log(
      error.message || error,
      "Connection to MongoDB was unsuccessful."
    );
  });
