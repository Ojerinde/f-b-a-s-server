const { Course, Attendance, Student } = require("../models/attendanceModel");
const catchAsync = require("../utils/catchAsync");

exports.takeAttendanceWithWebsocket = catchAsync(async (ws, clients, data) => {
  console.log(
    "Started attendance marking process with Websocket for",
    data.courseCode
  );

  const { courseCode, time: attendanceTime } = data;
  const [hours, minutes] = attendanceTime.split(":").map(Number);

  // Get the current time in UTC and add 1 hour to get Lagos time
  const now = new Date();
  const lagosTimeOffset = 60 * 60 * 1000;
  const lagosTime = new Date(now.getTime() + lagosTimeOffset);

  const startTime = new Date(
    lagosTime.getFullYear(),
    lagosTime.getMonth(),
    lagosTime.getDate(),
    lagosTime.getHours(),
    lagosTime.getMinutes()
  );

  const endTime = new Date(
    startTime.getTime() + (hours * 60 + minutes) * 60 * 1000
  );

  // Find the course by its course code
  const course = await Course.findOne({ courseCode });

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
    // Emit event to ESP 32 with all the data of the students enrolled for the course
    return clients.forEach((client) => {
      client.send(
        JSON.stringify({
          event: "take_attendance",
          payload: {
            courseCode: course.courseCode,
            // startTime: `${startTime.getHours()}:${startTime.getMinutes()}`,
            // endTime: `${endTime.getHours()}:${endTime.getMinutes()}`,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            startId: course.startId,
            endId: course.endId,
          },
        })
      );
    });
  }
});

exports.getAttendanceFeedbackFromEsp32 = catchAsync(
  async (ws, clients, payload) => {
    console.log("Attendance feedback received from ESP32", payload.courseCode);

    if (payload?.message === "Downloaded successfully") {
      console.log("Downloaded successfully");
      // Send a download success feedback to the UI
      return clients.forEach((client) => {
        client.send(
          JSON.stringify({
            event: "attendance_feedback",
            payload: {
              message: `${payload.courseCode} data downloaded succesfully`,
              error: false,
            },
          })
        );
      });
    }

    // Find the course by its course code
    const course = await Course.findOne({ courseCode: payload.courseCode });

    if (!course) {
      return clients.forEach((client) => {
        client.send(
          JSON.stringify({
            event: "attendance_feedback",
            payload: {
              message: `Course ${payload.courseCode} not found`,
              error: true,
            },
          })
        );
      });
    }

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
              message: `Attendance has already been marked for ${payload.courseCode} today`,
              error: true,
            },
          })
        );
      });
    }

    // Find students based on their idOnSensor and matricNo values
    const studentRecords = await Promise.all(
      payload.students.map(async (stu) => {
        const student = await Student.findOne({
          idOnSensor: stu.idOnSensor,
          matricNo: stu.matricNo,
        });
        return student ? { student: student._id, time: stu.time } : null;
      })
    );

    console.log("Student Records", studentRecords);

    // Filter out null values if any student was not found
    const validStudentRecords = studentRecords.filter(
      (record) => record !== null
    );

    console.log("Valid Student Records", validStudentRecords);

    if (validStudentRecords.length === 0) {
      return clients.forEach((client) => {
        client.send(
          JSON.stringify({
            event: "attendance_feedback",
            payload: {
              message: `No valid students found for course ${payload.courseCode}`,
              error: true,
            },
          })
        );
      });
    }

    const today = new Date();

    // Create a new attendance record for the current date
    const newAttendance = new Attendance({
      course: course._id,
      date: today,
      studentsPresent: validStudentRecords,
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
            message: `Attendance record for ${payload.courseCode} has been saved successfully`,
            error: false,
          },
        })
      );
    });
  }
);
