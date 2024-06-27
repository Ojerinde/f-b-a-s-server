const { Student, Course, Attendance } = require("../models/appModel");
const catchAsync = require("../utils/catchAsync");

exports.deleteFingerprintWithWebsocket = catchAsync(
  async (ws, clients, payload) => {
    console.log("Deleting Fingerprint for students:", payload.students);

    // Find students based on matriculation numbers
    const students = await Student.find({
      matricNo: { $in: payload.students },
    });

    if (!students || students.length === 0) {
      // Send feedback if no students found
      clients.forEach((client) => {
        client.send(
          JSON.stringify({
            event: "delete_fingerprint_feedback",
            payload: {
              message:
                "No students found with the provided matriculation numbers",
              error: true,
            },
          })
        );
      });
      return;
    }

    const deletePayload = {
      studentsIds: students.map((student) => student.idOnSensor),
      courseCode: payload.courseCode,
    };
    console.log("Deleting Payload:", deletePayload);

    // Emit event to ESP32
    return clients.forEach((client) => {
      client.send(
        JSON.stringify({
          event: "delete_fingerprint_request",
          payload: deletePayload,
        })
      );
    });
  }
);

exports.deleteFingerprintFeedback = catchAsync(async (ws, clients, payload) => {
  console.log("Fingerprint removal feedback received:", payload);
  const { studentsIds, courseCode } = payload.data;

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

  let student, course;

  for (const studentId of studentsIds) {
    student = await Student.findOne({
      idOnSensor: +studentId,
    });

    if (!student) {
      clients.forEach((client) => {
        client.send(
          JSON.stringify({
            event: "delete_fingerprint_feedback",
            payload: {
              message: `Student not found`,
              error: true,
            },
          })
        );
      });
      continue;
    }

    // Find the course by courseCode
    course = await Course.findOne({
      courseCode: courseCode,
    }).populate("students");

    if (!course) continue;

    // delete the student from the course
    course.students = course.students.filter((stu) => {
      return stu.idOnSensor !== +studentId;
    });
    await course.save();

    // Remove the student from attendance records of this course
    await Attendance.updateMany(
      { course: course._id },
      { $pull: { studentsPresent: { student: student._id } } }
    );

    // Check if the student is enrolled in any other courses
    const studentCourses = await Course.find({
      students: student._id,
    });

    // If the student is not enrolled in any other courses, delete the student
    if (studentCourses.length === 0) {
      await Student.findByIdAndDelete(student._id);
    }
  }

  // Send success feedback to clients
  return clients.forEach((client) => {
    client.send(
      JSON.stringify({
        event: "delete_fingerprint_feedback",
        payload: {
          message: `Fingerprint${
            studentsIds.length === 1 ? "" : "s"
          } and student${
            studentsIds.length === 1 ? "" : "s"
          } data has been deleted successfully`,
          error: false,
          students: course?.students,
        },
      })
    );
  });
});
