const catchAsync = require("../utils/catchAsync");
const {
  ArchivedStudent,
  ArchivedCourse,
  ArchivedLecturer,
  ArchivedAttendance,
} = require("../models/archiveModel");

exports.getArchivedLecturers = catchAsync(async (req, res, next) => {
  console.log("getArchivedLecturers called");

  const lecturers = await ArchivedLecturer.find().populate("selectedCourses");

  res.status(200).json(lecturers);
});

exports.getCourseStudents = catchAsync(async (req, res, next) => {
  console.log("getCourseStudents called with", req.params);

  const { courseId } = req.params;
  const course = await ArchivedCourse.findById(courseId).populate("students");
  console.log("course.students: ", course.students);

  if (!course) {
    return res.status(404).json({ error: "Course not found" });
  }
  console.log("course.students: ", course.students);

  res.status(200).json(course.students);
});

exports.getCourseAttendance = catchAsync(async (req, res, next) => {
  console.log("getCourseAttendance called with", req.params);

  const { courseId } = req.params;
  const attendanceRecords = await ArchivedAttendance.find({
    course: courseId,
  }).populate("studentsPresent.student");
  console.log("attendanceRecords: ", attendanceRecords);

  res.status(200).json(attendanceRecords);
});
