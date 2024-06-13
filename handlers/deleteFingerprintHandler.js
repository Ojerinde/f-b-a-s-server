const { Student, Course } = require("../models/appModel");
const catchAsync = require("../utils/catchAsync");

exports.deleteFingerprintWithWebsocket = catchAsync(
  async (ws, clients, payload) => {
    console.log("Deleting Fingerprint for:", payload.matricNo);
    const student = await Student.findOne({ matricNo: payload.matricNo });

    if (!student) {
      return clients.forEach((client) => {
        client.send(
          JSON.stringify({
            event: "delete_fingerprint_feedback",
            payload: {
              message: `Student with ${payload.matricNo} not found`,
              error: true,
            },
          })
        );
      });
    }

    const studentIdOnSensor = student.idOnSensor;

    // Emit event to ESP32
    return clients.forEach((client) => {
      client.send(
        JSON.stringify({
          event: "delete_fingerprint_request",
          payload: {
            idOnSensor: `${studentIdOnSensor}`,
            courseCode: `${payload.courseCode}`,
          },
        })
      );
    });
  }
);

exports.deleteFingerprintFeedback = catchAsync(async (ws, clients, payload) => {
  console.log("Fingerprint removal feedback received:", payload);

  if (payload.error) {
    return clients.forEach((client) => {
      client.send(
        JSON.stringify({
          event: "delete_fingerprint_feedback",
          payload: {
            message: `Failed to delete fingerprint template`,
            error: true,
          },
        })
      );
    });
  }

  // Find the student by idOnSensor
  const student = await Student.findOne({
    idOnSensor: payload.data.idOnSensor,
  });

  if (!student) {
    return clients.forEach((client) => {
      client.send(
        JSON.stringify({
          event: "delete_fingerprint_feedback",
          payload: {
            message: `Student with ${student.matricNo} not found`,
            error: true,
          },
        })
      );
    });
  }

  // Find the course to remove the student
  const course = await Course.findOne({
    courseCode: payload.data.courseCode,
  }).populate("students");

  // delete the student from the course
  course.students = course.students.filter(
    (stu) => stu.idOnSensor !== payload.data.idOnSensor
  );
  await course.save();

  // Delete the student from the database
  await Student.findByIdAndDelete(student._id);

  // Send success feedback to clients
  return clients.forEach((client) => {
    client.send(
      JSON.stringify({
        event: "delete_fingerprint_feedback",
        payload: {
          message: `Fingerprint and student data for ${student.matricNo} deleted successfully`,
          error: false,
        },
      })
    );
  });
});
