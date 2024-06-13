const express = require("express");
const router = express.Router();
const appController = require("../controllers/appController");

router.post("/lecturers", appController.createLecturer);

router.get("/courses/:lecturerEmail", appController.getLecturerCourses);

router.get(
  "/courses/:courseCode/attendance",
  appController.getAttendanceRecords
);

router.get("/courses/:courseCode/enroll", appController.getEnrolledStudents);

router.get(
  "/courses/:courseCode/:matricNo",
  appController.getStudentOtherDetails
);

router.delete(
  "/courses/:courseCode/disenroll/:matricNo",
  appController.disenrollStudent
);
router.delete("/courses/:courseCode/reset", appController.deleteCourseData);

module.exports = router;
