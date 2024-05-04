const express = require("express");
const router = express.Router();
const attendanceController = require("../controllers/attendanceController");

router.post("/lecturers", attendanceController.createLecturer);

router.get("/courses/:lecturerEmail", attendanceController.getLecturerCourses);

router.get(
  "/courses/:courseCode/attendance",
  attendanceController.getAttendanceRecords
);

router.get(
  "/courses/:courseCode/enroll",
  attendanceController.getEnrolledStudents
);

router.delete(
  "/courses/:courseCode/reset",
  attendanceController.deleteCourseData
);

module.exports = router;
