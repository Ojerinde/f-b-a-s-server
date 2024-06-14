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
            message: `Fail to clear all fingerprints`,
            error: true,
          },
        })
      );
    });
  }

  // Archive current data
  const students = await Student.find();
  const courses = await Course.find().populate("students attendance");
  const lecturers = await Lecturer.find().populate("selectedCourses");
  const attendances = await Attendance.find();

  const archivedStudents = await ArchivedStudent.insertMany(
    students.map((student) => ({ ...student.toObject(), _id: undefined }))
  );
  const archivedCourses = await ArchivedCourse.insertMany(
    courses.map((course) => ({
      ...course.toObject(),
      _id: undefined,
      students: course.students.map(
        (student) =>
          archivedStudents.find(
            (archivedStudent) => archivedStudent.matricNo === student.matricNo
          )._id
      ),
      attendance: course.attendance.map(
        (att) =>
          archivedAttendances.find(
            (a) => a.date.getTime() === att.date.getTime()
          )._id
      ),
    }))
  );
  const archivedLecturers = await ArchivedLecturer.insertMany(
    lecturers.map((lecturer) => ({
      ...lecturer.toObject(),
      _id: undefined,
      selectedCourses: lecturer.selectedCourses.map(
        (course) =>
          archivedCourses.find(
            (archivedCourse) => archivedCourse.courseCode === course.courseCode
          )._id
      ),
    }))
  );
  const archivedAttendances = await ArchivedAttendance.insertMany(
    attendances.map((attendance) => ({
      ...attendance.toObject(),
      _id: undefined,
      studentsPresent: attendance.studentsPresent.map((stuPres) => ({
        ...stuPres,
        student: archivedStudents.find(
          (archivedStudent) =>
            archivedStudent.matricNo === stuPres.student.matricNo
        )._id,
      })),
      course: archivedCourses.find(
        (archivedCourse) =>
          archivedCourse.courseCode === attendance.course.courseCode
      )._id,
    }))
  );

  // Remove all courses and student enrollments
  await Course.deleteMany({});
  await Student.deleteMany({});
  await Lecturer.updateMany({}, { $unset: { selectedCourses: [] } });
  await Attendance.deleteMany({});

  return clients.forEach((client) => {
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
