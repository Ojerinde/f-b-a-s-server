const catchAsync = require("../utils/catchAsync");

// Endpoint for fetching Esp32 details with Websocket.
exports.esp32DetailsWithWebsocket = catchAsync(async (socket, data) => {
  console.log("Starting to fetch Esp32 details with websocket for");

  // // TEST START
  // //   Emitting to the UI
  // const feedback = {
  //   esp32: {
  //     batteryCapacity: "6000mAH",
  //     batteryPercentage: "50",
  //     isConnectedToInternet: true,
  //     isCharging: false,
  //     isFingerprintActive: true,
  //     location: "ELT"
  //   },
  //   error: false,
  // };
  // return socket.emit("esp32_feedback", feedback);
  // // TEST END

  //   Emmiting to the Device
  socket.emit("get_espData");

  // Waiting for ESP32 device data
  socket.on("get_espData_feedback", async (feedback) => {
    console.log("ESP32 details feedback received:", feedback);

    //   Emitting to the UI
    return socket.emit("esp32_feedback", feedback);
  });
});
