/////// HTTPS Server ///////////////

const https = require("https");
const { Server } = require("socket.io");
const fs = require("fs");
const app = require("./app");
require("dotenv").config(); // Loads .env file contents into process.env.

const connectToMongoDB = require("./db");
const { enrollStudentWithWebsocket } = require("./handlers/enrollHandler");
const {
  takeAttendanceWithWebsocket,
} = require("./handlers/takeAttendanceHandler");
const { esp32DetailsWithWebsocket } = require("./handlers/esp32DetailsHandler");

const PORT = process.env.PORT || 8080;

const options = {
  key: fs.readFileSync("./key.pem"),
  cert: fs.readFileSync("./certificate.crt"),
};

const httpsServer = https.createServer(options, app);

const io = new Server(httpsServer, {
  cors: {
    origin: true,
    methods: ["POST", "PUT", "GET", "OPTIONS", "HEAD"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("a user connected");

  // Handle enrollment with websocket from the UI
  socket.on("enroll", (data) => enrollStudentWithWebsocket(socket, data));

  // Handle attendance with websocket from the UI
  socket.on("attendance", (data) => takeAttendanceWithWebsocket(socket, data));

  // Handle fetch esp32 details with websocket from the UI
  socket.on("esp32_details", (data) => esp32DetailsWithWebsocket(socket, data));
});

connectToMongoDB()
  .then(() => {
    console.log("Connection to MongoDB is successful.");
    httpsServer.listen(PORT, () => {
      console.log("Https Server running on port ->", PORT);
    });
  })
  .catch((error) => {
    console.log(
      error.message || error,
      "Connection to MongoDB was unsuccessful."
    );
  });
