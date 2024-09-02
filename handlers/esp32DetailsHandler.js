const catchAsync = require("../utils/catchAsync");

// Endpoint for fetching Esp32 details with Websocket.
exports.esp32DetailsWithWebsocket = catchAsync(async (ws, clients, payload) => {
  console.log("Starting to fetch Esp32 details with websocket", payload);
  const { deviceData } = payload;
  return clients.forEach((client) => {
    if (clients.clientType !== deviceData.deviceLocation) return;
    client.send(
      JSON.stringify({
        event: "esp32_data_request",
        payload: {
          message: "Requesting ESP32 details",
          deviceData,
        },
      })
    );
  });
});

exports.esp32DetailsFeedback = catchAsync(async (ws, clients, payload) => {
  console.log("Received feedback from ESP32 device:", payload);

  const { deviceData } = payload;

  if (payload.error) {
    return clients.forEach((client) => {
      if (clients.clientType !== deviceData.email) return;
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
    if (clients.clientType !== deviceData.email) return;
    client.send(
      JSON.stringify({
        event: "esp32_data_feedback",
        payload,
      })
    );
  });
});
