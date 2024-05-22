const catchAsync = require("../utils/catchAsync");
const WebSocket = require("ws");

// Endpoint for fetching Esp32 details with Websocket.
exports.esp32DetailsWithWebsocket = catchAsync(async (ws, clients) => {
  console.log("Starting to fetch Esp32 details with websocket");

  // Emit event to ESP32 device to get data
  const response = {
    event: "esp32_data_request",
    payload: "Requesting ESP32 details",
  };
  console.log("clients", clients.size);

  // Broadcast the message to all clients except the sender
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(response));
    }
  });
});

exports.esp32DetailsFeedback = catchAsync(async (ws, clients, payload) => {
  console.log("Received feedback from ESP32 device:");

  const response = {
    event: "esp32_data_feedback",
    payload,
  };

  // Broadcast the feedback to all clients except the sender
  clients.forEach((client, id) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(response));
    }
  });
});
