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

  if (!course) {
    return res.status(404).json({ error: "Course not found" });
  }

  const totalClasses = await ArchivedAttendance.countDocuments({
    course: courseId,
  });

  console.log("totalClasses: ", totalClasses);

  if (totalClasses === 0) {
    return res.status(200).json(
      course.students.map((student) => ({
        ...student.toObject(),
        attendancePercentage: 0,
      }))
    );
  }

  const attendances = await ArchivedAttendance.find({
    course: courseId,
  }).populate("studentsPresent.student");

  console.log("attendances: ", attendances);

  const studentAttendanceCount = {};

  attendances.forEach((attendance) => {
    console.log("Processing attendance record: ", attendance);
    attendance.studentsPresent.forEach(({ student }) => {
      console.log("Processing student in attendance: ", student);
      if (!studentAttendanceCount[student._id]) {
        studentAttendanceCount[student._id] = 0;
      }
      studentAttendanceCount[student._id]++;
    });
  });

  console.log("studentAttendanceCount: ", studentAttendanceCount);

  const studentsWithAttendance = course.students.map((student) => {
    const attendanceCount = studentAttendanceCount[student._id] || 0;
    const attendancePercentage = (attendanceCount / totalClasses) * 100;

    return {
      ...student.toObject(),
      attendancePercentage: attendancePercentage.toFixed(2),
    };
  });

  console.log("studentsWithAttendance: ", studentsWithAttendance);
  res.status(200).json(studentsWithAttendance);
});

exports.getCourseAttendance = catchAsync(async (req, res, next) => {
  console.log("getCourseAttendance called with", req.params);

  const { courseId } = req.params;
  const attendanceRecords = await ArchivedAttendance.find({
    course: courseId,
  }).populate("studentsPresent.student");

  console.log("attendanceRecords: ", attendanceRecords.studentsPresent);

  res.status(200).json(attendanceRecords);
});
