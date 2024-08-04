const { Course, Attendance } = require("../models/appModel");
const LevelAdviserUsers = require("../models/levelAdviserUserModel");
const catchAsync = require("./catchAsync");
const Email = require("./email");
const {
  generateAttendanceReportHTML,
  generateAttendanceAlertHTML,
} = require("./emailTemplates");

exports.checkAttendanceAndNotify = catchAsync(async (courseCode, studentsInCurrentAttendance) => {
  console.log("Sending", courseCode, "attendance alert and report");

  // Find the course by its course code
  const course = await Course.findOne({ courseCode })
    .populate("students")
    .populate("lecturer");
  // Find all attendance records for the course
  const attendanceRecords = await Attendance.find({ course: course._id });

  // Get the list of students enrolled in the course
  const enrolledStudents = course.students;

  // Track students who missed more than 50% of their attendances
  const studentsMissedMoreThanHalf = [];

  const totalClasses = attendanceRecords.length;

  // If the total number of classes is less than 4, do not send any notification
  if (totalClasses < 3) return;

  for (const student of enrolledStudents) {
    const missedCount = attendanceRecords.filter(
      (record) =>
        !record.studentsPresent.some(
          (att) => att.student.toString() === student._id.toString()
        )
    ).length;

    const missedPercentage = (missedCount / totalClasses) * 100;

    if (missedPercentage > 50) {
      studentsMissedMoreThanHalf.push({
        student,
        missedPercentage,
      });
    }
  }

  // Filter out students who are not in the current attendance to send mail to
  const studentToSendMailTo = studentsMissedMoreThanHalf.filter(
    (missedStudent) =>
      !studentsInCurrentAttendance.some(
        (currentStudent) =>
          currentStudent &&
          currentStudent.student.matricNo === missedStudent.student.matricNo
      )
  );

  if (studentToSendMailTo.length > 0) {
    // Send email to students who missed more than 50% of the classes and are not in the current attendance
    for (const { student, missedPercentage } of studentToSendMailTo) {
      const emailContent = generateAttendanceAlertHTML(
        student.name,
        courseCode,
        missedPercentage.toFixed(2)
      );
      const email = new Email(student, "");
      await email.send(emailContent, `Attendance Alert for ${courseCode}`);
    }

    // Compile names, matric numbers, and missed percentages of students
    const studentDetails = studentToSendMailTo.map(
      ({ student, missedPercentage }) => ({
        name: student.name,
        matricNo: student.matricNo,
        missedPercentage: missedPercentage.toFixed(2) + "%",
      })
    );

    // Get the level from courseCode
    const level = parseInt(courseCode.match(/\d+/)[0].charAt(0)) * 100;

    // Find the level adviser for the level
    const levelAdviser = await LevelAdviserUsers.findOne({ level });

    if (levelAdviser) {
      const levelAdviserEmailContent = generateAttendanceReportHTML(
        `${levelAdviser.title} ${levelAdviser.name}`,
        courseCode,
        studentDetails
      );
      const email = new Email(levelAdviser, "");
      await email.send(
        levelAdviserEmailContent,
        `Attendance Report for ${courseCode}`
      );
    }

    if (course.lecturer) {
      const lecturerEmailContent = generateAttendanceReportHTML(
        `${course.lecturer.title} ${course.lecturer.name}`,
        courseCode,
        studentDetails
      );
      const lecturerEmail = new Email(course.lecturer, "");
      await lecturerEmail.send(
        lecturerEmailContent,
        `Attendance Report for ${courseCode}`
      );
    }
  }
});
