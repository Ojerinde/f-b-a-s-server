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

const PORT = 5000;

const httpServer = createServer(app);

const clients = new Set();

// Initialize WebSocket server
const wss = new WebSocket.Server({ server: httpServer, path: "/ws" });

wss.on("connection", (ws) => {
  console.log("A client is connected");

  clients.add(ws);

  // Emit an event to the client upon connection every 15 seconds
  // setInterval(() => {
  //   ws.send(
  //     JSON.stringify({
  //       event: "serverMessage",
  //       payload: "Hello from fbas server!",
  //     })
  //   );
  //   ws.send(
  //     JSON.stringify({ event: "welcome", payload: "Welcome to fbas server!" })
  //   );
  // }, 15000);

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
      case "esp32_data_request":
        esp32DetailsWithWebsocket(ws, clients);
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
