const catchAsync = require("../utils/catchAsync");

exports.clearFingerprintsWithWebsocket = catchAsync(
  async (ws, clients, payload) => {
    console.log("Starting to fetch Esp32 details with websocket");

    // Send response to Web App
    if (payload.clearPhrase !== process.env.PHRASE_TO_CLEAR_FINGERPRINTS) {
      return clients.forEach((client) => {
        client.send(
          JSON.stringify({
            event: "clear_fingerprints_feedback",
            payload: {
              message: `The phrase entered is incorrect`,
              error: true,
            },
          })
        );
      });
    }

    // Send response to ESP32
    const response = {
      event: "empty_fingerprints_request",
      payload: "Requesting to clear all fingerprints",
    };

    clients.forEach((client) => {
      client.send(JSON.stringify(response));
    });
  }
);

exports.clearFingerprintsFeedback = catchAsync(async (ws, clients, payload) => {
  console.log("Received Clear fingerprints feedback from ESP32 device:");

  if (payload.error) {
    return clients.forEach((client) => {
      client.send(
        JSON.stringify({
          event: "clear_fingerprints_feedback",
          payload: {
            message: `Fail to clear all fingerprints`,
            error: true,
          },
        })
      );
    });
  }

  return clients.forEach((client) => {
    client.send(
      JSON.stringify({
        event: "clear_fingerprints_feedback",
        payload: {
          message: `All fingerprints cleared successfully`,
          error: false,
        },
      })
    );
  });
});
