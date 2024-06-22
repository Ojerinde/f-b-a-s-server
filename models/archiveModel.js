const mongoose = require("mongoose");

const archivedStudentSchema = new mongoose.Schema({
  name: String,
  email: String,
  matricNo: String,
  idOnSensor: Number,
  courses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }],
  archivedAt: { type: Date, default: Date.now },
});

const archivedCourseSchema = new mongoose.Schema({
  courseCode: String,
  courseName: String,
  lecturer: { type: mongoose.Schema.Types.ObjectId, ref: "Lecturer" },
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: "ArchivedStudent" }],
  attendance: [
    { type: mongoose.Schema.Types.ObjectId, ref: "ArchivedAttendance" },
  ],
  archivedAt: { type: Date, default: Date.now },
});

const archivedLecturerSchema = new mongoose.Schema({
  name: String,
  email: String,
  title: String,
  selectedCourses: [
    { type: mongoose.Schema.Types.ObjectId, ref: "ArchivedCourse" },
  ],
  archivedAt: { type: Date, default: Date.now },
});

const archivedAttendanceSchema = new mongoose.Schema({
  date: Date,
  studentsPresent: [
    {
      student: { type: mongoose.Schema.Types.ObjectId, ref: "ArchivedStudent" },
      time: String,
    },
  ],
  course: { type: mongoose.Schema.Types.ObjectId, ref: "ArchivedCourse" },
  archivedAt: { type: Date, default: Date.now },
});

const ArchivedStudent = mongoose.model(
  "ArchivedStudent",
  archivedStudentSchema
);
const ArchivedCourse = mongoose.model("ArchivedCourse", archivedCourseSchema);
const ArchivedLecturer = mongoose.model(
  "ArchivedLecturer",
  archivedLecturerSchema
);
const ArchivedAttendance = mongoose.model(
  "ArchivedAttendance",
  archivedAttendanceSchema
);

module.exports = {
  ArchivedStudent,
  ArchivedCourse,
  ArchivedLecturer,
  ArchivedAttendance,
};
