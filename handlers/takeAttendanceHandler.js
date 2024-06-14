const { Course, Attendance, Student } = require("../models/appModel");
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
  const course = await Course.findOne({ courseCode }).populate("students");

  if (!course) {
    return clients.forEach((client) => {
      client.send(
        JSON.stringify({
          event: "attendance_feedback",
          payload: {
            message: `Course ${courseCode} does not exist`,
            error: true,
          },
        })
      );
    });
  }

  // Check if there is an attendance for the day
  const fiveMinuteAgo = new Date(Date.now() - 1 * 60 * 1000);

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
  }

  // Get all registered student IDs for the course
  const registeredStudentsId = course.students.map(
    (student) => student.idOnSensor
  );

  // Emit event to ESP32 with all the data of the students enrolled for the course
  return clients.forEach((client) => {
    client.send(
      JSON.stringify({
        event: "attendance_request",
        payload: {
          courseCode: course.courseCode,
          startTime: startTime.toISOString(),
          stopTime: endTime.toISOString(),
          enrolledStudentsId: registeredStudentsId.filter((id) => id !== null),
        },
      })
    );
  });
});

exports.getAttendanceFeedbackFromEsp32 = catchAsync(
  async (ws, clients, payload) => {
    console.log("Attendance feedback received from ESP32", payload);

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

    const attendanceDate = new Date(payload.data.date);

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

    // Remove duplicates based on idOnSensor
    const uniqueStudents = payload.data.students.filter(
      (stu, index, self) =>
        index === self.findIndex((s) => s.idOnSensor === stu.idOnSensor)
    );
    console.log("Unique Students", uniqueStudents);

    // Find students based on their idOnSensor
    const studentRecords = await Promise.all(
      uniqueStudents.map(async (stu) => {
        const student = await Student.findOne({ idOnSensor: stu.idOnSensor });
        console.log("Students And Course", student, course.students);

        if (student && course.students.includes(student._id)) {
          return { student: student._id, time: stu.time };
        }
        return null;
      })
    );

    console.log("Student Records", studentRecords);

    // Filter out null values if any student was not found or is not enrolled in the course
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
