const catchAsync = require("../utils/catchAsync");

// Endpoint for fetching Esp32 details with Websocket.
exports.esp32DetailsWithWebsocket = catchAsync(async (ws, clients) => {
  console.log("Starting to fetch Esp32 details with websocket");

  clients.forEach((client) => {
    client.send(
      JSON.stringify({
        event: "esp32_data_request",
        payload: "Requesting ESP32 details",
      })
    );
  });
});

exports.esp32DetailsFeedback = catchAsync(async (ws, clients, payload) => {
  console.log("Received feedback from ESP32 device:");

  if (payload.error) {
    return clients.forEach((client) => {
      client.send(
        JSON.stringify({
          event: "esp32_data_feedback",
          payload: {
            error: true,
          },
        })
      );
    });
  }

  return clients.forEach((client) => {
    client.send(
      JSON.stringify({
        event: "esp32_data_feedback",
        payload,
      })
    );
  });
});
