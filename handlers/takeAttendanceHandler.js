const { Course, Student, Attendance } = require("../models/attendanceModel");
const catchAsync = require("../utils/catchAsync");

exports.takeAttendanceWithWebsocket = catchAsync(async (socket, data) => {
  console.log(
    "Started attendance marking process with Websocket for",
    data.matricNo
  );

  const { courseCode, matricNo } = data;

  // Find the course by its course code
  const course = await Course.findOne({ courseCode });

  // Find the student by their matriculation number
  const student = await Student.findOne({ matricNo });

  if (!student) {
    return socket.emit("attendance_feedback", {
      message: `Student not found`,
      error: true,
    });
  }

  // Check if the student is enrolled in the course
  if (!student.courses.includes(course._id)) {
    return socket.emit("attendance_feedback", {
      message: `Student is not enrolled in the course`,
      error: true,
    });
  }

  // 2 minute for Development
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

  // 24 hours for Production
  // const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Check if there is an attendance for the day
  const existingAttendance = await Attendance.findOne({
    course: course._id,
    date: { $gte: twoMinutesAgo },
  });

  if (existingAttendance) {
    console.log("Existing Attendance");
    // Check if the student has already been marked present
    if (existingAttendance.studentsPresent.includes(student._id)) {
      return socket.emit("attendance_feedback", {
        message: `Attendance has already been marked for ${student.matricNo} today`,
        error: true,
      });
    } else {
      //// TEST Start////
      existingAttendance.studentsPresent.push(student._id);
      await existingAttendance.save();

      // Emit feedback to indicate successful attendance marking
      return socket.emit("attendance_feedback", {
        message: `Attendance marked successfully for ${student.matricNo}`,
        error: false,
      });
      //// TEST End ////

      // Emit the event to the ESP 32 here as well
      // Emit a 'take_attendance' event to ESP32 device
      socket.emit("take_attendance", { courseCode, matricNo });

      // Wait for attendance feedback from ESP32 device
      socket.on("attendance_feedback", async (feedback) => {
        console.log("Attendance feedback received:", feedback);
        // If feedback indicates an error, send response to the frontend
        if (feedback.error) {
          return socket.emit("attendance_feedback", {
            message: `Error occurred during attendance marking: ${feedback.error}`,
            error: true,
          });
        } else {
          // If feedback indicates success, send response to the frontend
          // Update the existing attendance record to include the student
          existingAttendance.studentsPresent.push(student._id);
          await existingAttendance.save();

          // Emit feedback to indicate successful attendance marking
          return socket.emit("attendance_feedback", {
            message: `Attendance marked successfully for ${student.matricNo}`,
            error: false,
          });
        }
      });
    }
  }
  const today = new Date();

  //// TEST without ESP32 start /////
  // If feedback indicates success, send response to the frontend
  // Create a new attendance record for the current date
  const newAttendance = new Attendance({
    course: course._id,
    date: today,
    studentsPresent: [student._id],
  });
  await newAttendance.save();

  // Update the attendance property in the Course schema
  course.attendance.push(newAttendance._id);
  await course.save();

  return socket.emit("attendance_feedback", {
    message: `Attendance marked successfully for ${student.matricNo}`,
    error: false,
  });

  ///// TEST End /////

  // Emit a 'take_attendance' event to ESP32 device
  socket.emit("take_attendance", { courseCode, matricNo });

  // Wait for attendance feedback from ESP32 device
  socket.on("attendance_feedback", async (feedback) => {
    console.log("Attendance feedback received:", feedback);
    // If feedback indicates an error, send response to the frontend
    if (feedback.error) {
      return socket.emit("attendance_feedback", {
        message: `Error occurred during attendance marking: ${feedback.error}`,
        error: true,
      });
    } else {
      // If feedback indicates success, send response to the frontend
      // Create a new attendance record for the current date
      const newAttendance = new Attendance({
        course: course._id,
        date: today,
        studentsPresent: [student._id],
      });
      await newAttendance.save();

      // Update the attendance property in the Course schema
      course.attendance.push(newAttendance._id);
      await course.save();

      return socket.emit("attendance_feedback", {
        message: `Attendance marked successfully ${student.matricNo}`,
        error: false,
      });
    }
  });
});
