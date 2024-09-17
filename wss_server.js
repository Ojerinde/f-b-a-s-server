const { createServer } = require("https");
const WebSocket = require("ws");
const fs = require("fs");
const { Course, Student, DevicesConnected } = require("./models/appModel");
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
    "/etc/letsencrypt/live/api.smartattendancesystem.com.ng/privkey.pem"
  ),
  cert: fs.readFileSync(
    "/etc/letsencrypt/live/api.smartattendancesystem.com.ng/fullchain.pem"
  ),
};

const httpsServer = createServer(options, app);

let wss;

// Initialize WebSocket server
function initWebSocketServer() {
  wss = new WebSocket.Server({ server: httpsServer, path: "/ws" });

  wss.on("connection", (ws) => {
    console.log("A client device is connected to the server");

    // Temporary property to store client type
    ws.clientType = null;
    ws.source = null;

    // Handle incoming messages
    ws.on("message", async (message) => {
      const data = JSON.parse(message);
      console.log(
        `${data?.event} event with ${data?.payload} received from client`
      );

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
          enrollStudentWithWebsocket(ws, wss.clients, data.payload);
          break;
        case "attendance":
          takeAttendanceWithWebsocket(ws, wss.clients, data.payload);
          break;
        case "esp32_data":
          esp32DetailsWithWebsocket(ws, wss.clients, data.payload);
          break;
        case "clear_fingerprints":
          clearFingerprintsWithWebsocket(ws, wss.clients, data.payload);
          break;
        case "delete_fingerprint":
          deleteFingerprintWithWebsocket(ws, wss.clients, data.payload);
          break;

        // Feedback from ESP32 device
        case "enroll_response":
          getEnrollFeedbackFromEsp32(ws, wss.clients, data.payload);
          break;
        case "attendance_response":
          getAttendanceFeedbackFromEsp32(ws, wss.clients, data.payload);
          break;
        case "esp32_data_response":
          esp32DetailsFeedback(ws, wss.clients, data.payload);
          break;
        case "empty_fingerprints_response":
          clearFingerprintsFeedback(ws, wss.clients, data.payload);
          break;
        case "delete_fingerprint_response":
          deleteFingerprintFeedback(ws, wss.clients, data.payload);
          break;
        default:
          console.log("Unknown event:", data.event);
      }
    });

    // ws.on("ping", (buffer) => {
    //   const locationUtf8 = buffer.toString("utf8");
    //   console.log(
    //     "Received ping from hardware",
    //     buffer,
    //     "location",
    //     locationUtf8
    //   );
    // });

    ws.on("close", async () => {
      console.log(`${ws?.clientType} client is disconnected`);
    });
  });

  // Start the cleanup process after a timeout period
  setTimeout(async () => {
    try {
      console.log("Starting enrollment cleanup process...");

      // Find students whose idOnSensor is not set
      const studentsToClean = await Student.find({
        idOnSensor: { $exists: false },
      });

      // Perform rollback actions for each student
      for (const student of studentsToClean) {
        console.log(
          "Rolling back enrollment process for student with Matric No.",
          student.matricNo
        );

        // Rollback actions: Delete the created student and remove from course
        await Promise.all([
          Student.findByIdAndDelete(student._id),
          Course.updateMany(
            { students: student._id },
            { $pull: { students: student._id } }
          ),
        ]);
      }

      console.log("Enrollment cleanup process completed.");
    } catch (error) {
      console.error("Error during enrollment cleanup:", error);
    }
  }, 60000);

  // Handle server shutdown
  httpsServer.on("close", () => {
    wss.close(() => {
      console.log("WebSocket server closed");
    });
  });
}

connectToMongoDB()
  .then(() => {
    console.log("Connection to MongoDB is successful.");
    httpsServer.listen(PORT, () => {
      console.log("Secure websocket server running on port ->", PORT);
      initWebSocketServer();
    });
  })
  .catch((error) => {
    console.log(
      error.message || error,
      "Connection to MongoDB was unsuccessful."
    );
  });
