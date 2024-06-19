const catchAsync = require("../utils/catchAsync");
const { Course, Student, Lecturer, Attendance } = require("../models/appModel");
const {
  ArchivedStudent,
  ArchivedCourse,
  ArchivedLecturer,
  ArchivedAttendance,
} = require("../models/archiveModel");

exports.clearFingerprintsWithWebsocket = catchAsync(
  async (ws, clients, payload) => {
    console.log("Starting to clear all fingerprints with websocket");

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
            message: `Failed to clear all fingerprints`,
            error: true,
          },
        })
      );
    });
  }

  // Archive current data
  const students = await Student.find().populate("courses");
  const courses = await Course.find().populate("students attendance");
  const lecturers = await Lecturer.find().populate("selectedCourses");
  const attendances = await Attendance.find();

  // Archive students
  const archivedStudents = await ArchivedStudent.insertMany(
    students.map((student) => ({
      ...student.toObject(),
      _id: student._id, // Retain original ID
    }))
  );

  const archivedAttendances = await ArchivedAttendance.insertMany(
    attendances.map((attendance) => {
      return {
        ...attendance.toObject(),
        _id: attendance._id, // Retain original ID
        studentsPresent: attendance.studentsPresent,
        course: attendance.course, // Direct reference to the course
      };
    })
  );

  // Archive courses
  const archivedCourses = await ArchivedCourse.insertMany(
    courses.map((course) => ({
      ...course.toObject(),
      _id: course._id, // Retain original ID
      students: course.students.map(
        (student) =>
          archivedStudents.find(
            (archivedStudent) => archivedStudent.matricNo === student.matricNo
          )?._id
      ),
      attendance: course.attendance.map(
        (att) =>
          archivedAttendances.find(
            (a) => a._id.toString() === att._id.toString()
          )?._id
      ),
    }))
  );

  // Archive lecturers
  const archivedLecturers = await ArchivedLecturer.insertMany(
    lecturers.map((lecturer) => ({
      ...lecturer.toObject(),
      _id: lecturer._id, // Retain original ID
      selectedCourses: lecturer.selectedCourses.map(
        (course) =>
          archivedCourses.find(
            (archivedCourse) => archivedCourse.courseCode === course.courseCode
          )?._id
      ),
    }))
  );

  await Course.deleteMany({});
  await Student.deleteMany({});
  await Lecturer.updateMany({}, { $unset: { selectedCourses: 1 } });
  await Attendance.deleteMany({});

  // Send success feedback to clients
  clients.forEach((client) => {
    client.send(
      JSON.stringify({
        event: "clear_fingerprints_feedback",
        payload: {
          message: `All fingerprints cleared successfully and courses removed`,
          error: false,
        },
      })
    );
  });
});
