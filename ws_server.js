const { createServer } = require("http");
const WebSocket = require("ws");
require("dotenv").config(); // Loads .env file contents into process.env.

const app = require("./app");
const connectToMongoDB = require("./db");
const { enrollStudentWithWebsocket } = require("./handlers/enrollHandler");
const {
  takeAttendanceWithWebsocket,
} = require("./handlers/takeAttendanceHandler");
const { esp32DetailsWithWebsocket } = require("./handlers/esp32DetailsHandler");

const PORT = process.env.PORT || 8080;

const httpServer = createServer(app);

// Initialize WebSocket server
const wss = new WebSocket.Server({ server: httpServer, path: "/ws" });

wss.on("connection", (ws) => {
  console.log("A client is connected");

  // Emit an event to the client upon connection
  ws.send(
    JSON.stringify({
      event: "serverMessage",
      message: "Hello from fbas server!",
    })
  );
  ws.send(
    JSON.stringify({ event: "welcome", message: "Welcome to fbas server!" })
  );

  // Handle incoming messages
  ws.on("message", (message) => {
    const data = JSON.parse(message);

    switch (data.event) {
      case "enroll":
        enrollStudentWithWebsocket(ws, data.payload);
        break;
      case "attendance":
        takeAttendanceWithWebsocket(ws, data.payload);
        break;
      case "esp32_details":
        esp32DetailsWithWebsocket(ws, data.payload);
        break;
      default:
        console.log("Unknown event:", data.event);
    }
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
