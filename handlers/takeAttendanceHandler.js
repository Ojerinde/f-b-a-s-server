const { Course, Attendance } = require("../models/attendanceModel");
const catchAsync = require("../utils/catchAsync");

exports.takeAttendanceWithWebsocket = catchAsync(async (socket, data) => {
  console.log(
    "Started attendance marking process with Websocket for",
    data.courseCode
  );

  const { courseCode } = data;

  // Find the course by its course code
  const course = await Course.findOne({ courseCode }).populate("students");

  // const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const fiveMinuteAgo = new Date(Date.now() - 5 * 60 * 1000);

  // Check if there is an attendance for the day
  const existingAttendance = await Attendance.findOne({
    course: course._id,
    date: { $gte: fiveMinuteAgo },
  });

  if (existingAttendance) {
    return socket.emit("attendance_feedback", {
      message: `Attendance has already been marked for ${courseCode} today`,
      error: true,
    });
  } else {
    console.log("Course Students", course.students);

    // //// Test Start ////
    // socket.emit("attendance_feedback", {
    //   message: `Students data downloaded succesfully`,
    //   error: false,
    // });

    // setTimeout(async () => {
    //   // Wait for attendance feedback from ESP32 device (Maybe after an hr)
    //   const today = new Date();
    //   console.log(
    //     "Attendance ID",
    //     course.students.map((stu) => stu._id)
    //   );

    //   // Create a new attendance record for the current date
    //   const newAttendance = new Attendance({
    //     course: course._id,
    //     date: today,
    //     studentsPresent: course.students.map((stu) => stu._id),
    //   });
    //   await newAttendance.save();

    //   // Update the attendance property in the Course schema
    //   course.attendance.push(newAttendance._id);
    //   await course.save();
    //   return socket.emit("attendance_record_feedback", {
    //     message: `Attendance record has been saved`,
    //     error: false,
    //   });
    // }, 2000);
    // //// Test End ////

    // Emit event to ESP 32 with all the data of the students enrolled for the course
    socket.emit("take_attendance", course.students);

    // Listen to on-successful downloading of students
    socket.on("attendance_downloaded", async (feedback) => {
      console.log("Attendance Downloaded successfuly:", feedback);

      // Send a feedback to the UI
      return socket.emit("attendance_feedback", {
        message: `Students data downloaded succesfully`,
        error: false,
      });
    });

    // Wait for attendance feedback from ESP32 device (Maybe after an hr)
    socket.on("attendance_feedback", async (feedback) => {
      console.log("Attendance feedback received:", feedback);
      const today = new Date();

      // Create a new attendance record for the current date
      const newAttendance = new Attendance({
        course: course._id,
        date: today,
        studentsPresent: feedback.data.students.map((stu) => stu._id),
      });
      await newAttendance.save();

      // Update the attendance property in the Course schema
      course.attendance.push(newAttendance._id);
      await course.save();
    });
  }
});
