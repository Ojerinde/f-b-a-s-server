const express = require("express");
const router = express.Router();
const attendanceController = require("../controllers/attendanceController");

router.post("/lecturers", attendanceController.createLecturer);

router.get("/courses/:lecturerEmail", attendanceController.getLecturerCourses);

router.get(
  "/courses/attendance/:courseCode",
  attendanceController.getAttendanceRecords
);

router.get(
  "/courses/enroll/:courseCode",
  attendanceController.getEnrolledStudents
);
// Using Websocket for these in the server file
// router.post("/courses/attendance", attendanceController.takeAttendance);
// router.post(
//   "/courses/enroll/:lecturerEmail",
//   attendanceController.enrollStudent
// );

module.exports = router;
