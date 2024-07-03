const express = require("express");
const router = express.Router();
const appController = require("../controllers/appController");
const archiveController = require("../controllers/archiveController");

router.post("/lecturers", appController.createLecturer);

router.get("/courses/:lecturerEmail", appController.getLecturerCourses);

router.get(
  "/courses/:courseCode/attendance",
  appController.getAttendanceRecords
);

router.get("/courses/:courseCode/enroll", appController.getEnrolledStudents);
router.get("/courses/:courseCode/reports", appController.getCourseReports);

router.get(
  "/courses/:courseCode/:matricNo",
  appController.getStudentOtherDetails
);

router.delete(
  "/courses/:courseCode/disenroll/:matricNo",
  appController.disenrollStudent
);
router.delete("/courses/:courseCode/reset", appController.deleteCourseData);

/////////////////////////
// Archive routes
router.get("/archived_lecturers", archiveController.getArchivedLecturers);
router.get("/archived_students/:courseId", archiveController.getCourseStudents);
router.get(
  "/archived_attendance/:courseId",
  archiveController.getCourseAttendance
);

module.exports = router;
