const schedule = require("node-schedule");
const { Course, Attendance } = require("../models/appModel");
const catchAsync = require("../utils/catchAsync");

const convertToUTC = (lagosTime) => {
  const date = new Date(lagosTime);
  const utcTime = new Date(date.getTime() - 60 * 60 * 1000); // Convert from GMT+1 to GMT
  return utcTime;
};

exports.takeAttendanceWithWebsocket = async (ws, clients, data) => {
  console.log("Started attendance marking process with Websocket for", data);

  const { courseCode, startTime, endTime } = data;

  // Find the course by its course code
  const course = await Course.findOne({ courseCode }).populate("students");

  if (!course) {
    return clients.forEach((client) => {
      client.send(
        JSON.stringify({
          event: "attendance_feedback",
          payload: {
            message: `Course not found`,
            error: true,
          },
        })
      );
    });
  }

  const startDate = new Date(startTime);
  const endDate = new Date(endTime);

  const scheduleDate = convertToUTC(startDate);

  console.log(
    "Scheduling job for",
    startDate,
    "to",
    endDate,
    "UTC time",
    scheduleDate
  );

  // Schedule the job to emit the attendance event at the start time
  schedule.scheduleJob(scheduleDate, async () => {
    console.log("Schedule Attendance marking started for", course.courseCode);
    const now = new Date();

    // Adding log to check the execution time
    console.log("Job executed at:", now);

    const fiveMinutesAgo = new Date(startDate.getTime() - 5 * 60 * 1000);
    console.log("fiveMinutesAgo", fiveMinutesAgo);

    const existingAttendance = await Attendance.findOne({
      course: course._id,
      date: { $gte: fiveMinutesAgo },
    });

    if (existingAttendance) {
      return clients.forEach((client) => {
        client.send(
          JSON.stringify({
            event: "attendance_feedback",
            payload: {
              message: `Attendance has already been marked for ${course.courseCode} today`,
              error: true,
            },
          })
        );
      });
    }

    const registeredStudentsId = course.students.map(
      (student) => student.idOnSensor
    );

    const enrolledStudentsId = registeredStudentsId.filter(
      (id) => id !== null && id !== undefined
    );

    console.log("Enrolled Students ID", enrolledStudentsId);

    if (enrolledStudentsId.length === 0) {
      return clients.forEach((client) => {
        client.send(
          JSON.stringify({
            event: "attendance_feedback",
            payload: {
              message: `No student is enrolled for ${course.courseCode}`,
              error: true,
            },
          })
        );
      });
    }

    clients.forEach((client) => {
      client.send(
        JSON.stringify({
          event: "attendance_request",
          payload: {
            courseCode: course.courseCode,
            startTime: startDate.toISOString(),
            endTime: endDate.toISOString(),
            enrolledStudentsId: enrolledStudentsId,
          },
        })
      );
    });

    console.log(
      `Attendance marked for course ${course.courseCode} at ${startDate}`
    );
  });
};

exports.getAttendanceFeedbackFromEsp32 = catchAsync(
  async (ws, clients, payload) => {
    console.log("Attendance response received from ESP32", payload);

    if (payload.error) {
      return clients.forEach((client) => {
        client.send(
          JSON.stringify({
            event: "attendance_feedback",
            payload: {
              message: `Attendance not taken successfully`,
              error: true,
            },
          })
        );
      });
    }

    if (payload?.data.message === "Downloaded successfully") {
      return clients.forEach((client) => {
        client.send(
          JSON.stringify({
            event: "attendance_feedback",
            payload: {
              message: `${payload.data.courseCode} data downloaded successfully`,
              error: false,
            },
          })
        );
      });
    }

    // Find the course by its course code
    const course = await Course.findOne({
      courseCode: payload.data.courseCode,
    }).populate("students");

    if (!course) {
      return clients.forEach((client) => {
        client.send(
          JSON.stringify({
            event: "attendance_feedback",
            payload: {
              message: `Course ${payload.data.courseCode} not found`,
              error: true,
            },
          })
        );
      });
    }

    const attendanceDate = payload.data.date;

    // Check if there is an attendance for the exact date and time
    const existingAttendance = await Attendance.findOne({
      course: course._id,
      date: attendanceDate,
    });

    if (existingAttendance) {
      return clients.forEach((client) => {
        client.send(
          JSON.stringify({
            event: "attendance_feedback",
            payload: {
              message: `Attendance has already been marked for ${payload.data.courseCode} at ${payload.data.date}`,
              error: true,
            },
          })
        );
      });
    }

    // Find students based on their idOnSensor
    const studentRecords = await Promise.all(
      payload.data.students.map(async (stu) => {
        const student = await Student.findOne({ idOnSensor: stu.idOnSensor });

        if (student) {
          return { student, time: stu.time };
        }
        return null;
      })
    );

    // Filter out null values if any student was not found or is not enrolled in the course
    const validStudentRecords = studentRecords.filter(
      (record) => record !== null
    );

    if (validStudentRecords.length === 0) {
      return clients.forEach((client) => {
        client.send(
          JSON.stringify({
            event: "attendance_feedback",
            payload: {
              message: `No valid students found for course ${payload.data.courseCode}`,
              error: true,
            },
          })
        );
      });
    }

    // Create a new attendance record for the provided date
    const newAttendance = new Attendance({
      course: course._id,
      date: attendanceDate,
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
            message: `Attendance record for ${payload.data.courseCode} has been saved successfully`,
            error: false,
          },
        })
      );
    });
  }
);
