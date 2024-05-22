const { Course, Attendance } = require("../models/attendanceModel");
const catchAsync = require("../utils/catchAsync");

exports.takeAttendanceWithWebsocket = catchAsync(async (ws, clients, data) => {
  console.log(
    "Started attendance marking process with Websocket for",
    data.courseCode
  );

  const { courseCode } = data;

  // Find the course by its course code
  const course = await Course.findOne({ courseCode }).populate("students");

  // const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const fiveMinuteAgo = new Date(Date.now() - 1 * 60 * 1000);

  // Check if there is an attendance for the day
  const existingAttendance = await Attendance.findOne({
    course: course._id,
    date: { $gte: fiveMinuteAgo },
  });

  if (existingAttendance) {
    return clients.forEach((client) => {
      client.send(
        JSON.stringify({
          event: "attendance_feedback",
          payload: {
            message: `Attendance has already been marked for ${courseCode} today`,
            error: true,
          },
        })
      );
    });
  } else {
    console.log("Course Students", course.students);

    // Emit event to ESP 32 with all the data of the students enrolled for the course
    return clients.forEach((client) => {
      client.send(
        JSON.stringify({
          event: "take_attendance",
          payload: { students: course.students, courseCode: course.courseCode },
        })
      );
    });
  }
});

exports.getAttendanceFeedbackFromEsp32 = catchAsync(
  async (ws, clients, data) => {
    console.log("Attendance feedback received from ESP32", data);

    if (data?.message === "Downloaded successfully") {
      console.log("Downloaded successfully");
      // Send a download success feedback to the UI
      return clients.forEach((client) => {
        client.send(
          JSON.stringify({
            event: "attendance_feedback",
            payload: {
              message: `${data.courseCode} students data downloaded succesfully`,
              error: false,
            },
          })
        );
      });
    }

    // Wait for attendance feedback from ESP32 device (Maybe after an hr)

    // Find the course by its course code
    const course = await Course.findOne({ courseCode: data.courseCode });

    const today = new Date();

    // Create a new attendance record for the current date
    const newAttendance = new Attendance({
      course: course._id,
      date: today,
      studentsPresent: data?.students.map((stu) => stu._id),
    });
    await newAttendance.save();

    // Update the attendance property in the Course schema
    course.attendance.push(newAttendance._id);
    await course.save();

    return clients.forEach((client) => {
      client.send(
        JSON.stringify({
          event: "attendance_feedback",
          payload: {
            message: `Attendance record for ${data.courseCode}  has been saved successfully`,
            error: false,
          },
        })
      );
    });
  }
);
