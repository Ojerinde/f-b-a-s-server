const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const { Lecturer, Course, Student, Attendance } = require("../models/appModel");

exports.createLecturer = catchAsync(async (req, res, next) => {
  console.log("Creating Lecturer with", req.body);

  const { name, email, title, courses: requestedCourses } = req.body;

  // Filter out courses that are already assigned to another lecturer
  const newCourses = [];
  const courseCodes = requestedCourses.map((course) => course.courseCode);

  for (let course of requestedCourses) {
    // Check if the course is assigned to any lecturer
    const courseRecord = await Course.findOne({
      courseCode: course.courseCode,
    });
    if (courseRecord && courseRecord.lecturer) {
      console.log(
        `Course ${course.courseCode} is already assigned to another lecturer`
      );
    } else {
      newCourses.push(course);
    }
  }

  // Check if the lecturer already exists based on email
  let lecturer = await Lecturer.findOne({ email });

  if (!lecturer) {
    // Create a new lecturer
    lecturer = await Lecturer.create({
      name,
      email,
      title,
      selectedCourses: [],
    });
  }

  // Remove courses from the lecturer's selectedCourses that are not in the request
  const removedCourseCodes = lecturer.selectedCourses
    .filter(
      (course) =>
        !requestedCourses.some(
          (newCourse) => newCourse.courseCode === course.courseCode
        )
    )
    .map((course) => course.courseCode);

  if (removedCourseCodes.length > 0) {
    await Lecturer.updateOne(
      { email },
      {
        $pull: { selectedCourses: { courseCode: { $in: removedCourseCodes } } },
      }
    );

    // Check if the removed courses are still assigned to any lecturer and delete if not
    for (let courseCode of removedCourseCodes) {
      const otherLecturer = await Lecturer.findOne({
        selectedCourses: { $elemMatch: { courseCode } },
      });

      if (!otherLecturer) {
        await Course.deleteOne({ courseCode });
      }
    }
  }

  // If no new courses remain to be added and no courses to remove, send an error response
  if (newCourses.length === 0 && removedCourseCodes.length === 0) {
    return res
      .status(400)
      .json({ message: "All courses already exist or are already removed" });
  }

  // Add new courses to the Course table and assign to the lecturer
  for (let course of newCourses) {
    let courseRecord = await Course.findOne({ courseCode: course.courseCode });
    if (!courseRecord) {
      courseRecord = new Course({
        courseCode: course.courseCode,
        courseName: course.courseName,
        lecturer: lecturer._id,
        students: [],
        attendance: [],
      });
      await courseRecord.save();
    } else {
      courseRecord.lecturer = lecturer._id;
      await courseRecord.save();
    }

    // Add course to lecturer's selectedCourses if not already present
    if (
      !lecturer.selectedCourses.some((c) => c.courseCode === course.courseCode)
    ) {
      lecturer.selectedCourses.push({
        courseCode: course.courseCode,
        courseName: course.courseName,
      });
    }
  }

  await lecturer.save();

  // Refetch the updated list of courses from the database
  const updatedLecturer = await Lecturer.findOne({ email });

  // Respond with the updated list of courses
  res.status(200).json({ courses: updatedLecturer.selectedCourses });
});

exports.getLecturerCourses = catchAsync(async (req, res, next) => {
  // Fetch all active courses for the logged-in lecturer
  const loggedInLecturer = await Lecturer.findOne({
    email: req.params.lecturerEmail,
  });

  res.status(200).json({ courses: loggedInLecturer.selectedCourses });
});

// Endpoint for fetching all students enrolled in a course
exports.getEnrolledStudents = catchAsync(async (req, res, next) => {
  console.log("Getting Enrolled Students for", req.params);

  const { courseCode } = req.params;

  // Find the course by its course code and populate the 'students' field to get student details
  const course = await Course.findOne({ courseCode }).populate("students");
  console.log("Course", course);

  if (!course) {
    return res.status(404).json({ message: "Course not found" });
  }

  res.status(200).json({ students: course.students });
});

// Endpoint for fetching attendance records for a course
exports.getAttendanceRecords = catchAsync(async (req, res, next) => {
  const { courseCode } = req.params;

  // Find the course by its course code
  const course = await Course.findOne({ courseCode });

  if (!course) {
    return res.status(404).json({ message: "Course not found" });
  }

  // Retrieve the attendance records for the course
  const attendanceRecords = await Attendance.find({
    course: course._id,
  }).populate({
    path: "studentsPresent.student",
    model: "Student",
  });

  res.status(200).json({ attendanceRecords });
});

// Endpoint for deleting attendance records and enrolled students for a course
exports.deleteCourseData = catchAsync(async (req, res, next) => {
  const { courseCode } = req.params;

  // Find the course by its course code
  const course = await Course.findOne({ courseCode });

  if (!course) {
    return res.status(404).json({ message: "Course not found" });
  }

  // Delete attendance records for the course
  await Attendance.deleteMany({ course: course._id });

  // Find all students enrolled in the course
  const students = await Student.find({ courses: course._id });

  // Remove the course reference from the courses array for each student
  await Promise.all(
    students.map(async (student) => {
      student.courses = student.courses.filter(
        (courseId) => courseId.toString() !== course._id.toString()
      );
      await student.save();
    })
  );

  // Remove enrolled students from the course
  course.students = [];
  await course.save();

  // Find students who are not enrolled in any courses anymore
  const studentsNotEnrolled = await Student.find({ courses: { $size: 0 } });

  return res.status(200).json({
    message: `Course data for ${courseCode} has been reset`,
    students: studentsNotEnrolled,
    courseCode,
  });
});

exports.disenrollStudent = catchAsync(async (req, res, next) => {
  const { courseCode, matricNo } = req.params;
  const modifiedMatricNo = matricNo.replace("_", "/");

  console.log("Disenrolling student", courseCode, matricNo);

  // Find the course by its course code
  const course = await Course.findOne({ courseCode }).populate("students");

  if (!course) {
    return res.status(404).json({ message: "Course not found" });
  }

  // Find the student by matriculation number
  const student = await Student.findOne({ matricNo: modifiedMatricNo });

  if (!student) {
    return res.status(404).json({ message: "Student not found" });
  }

  // Filter out the disenrolled student from the course's students list
  course.students = course.students.filter(
    (stu) => stu.matricNo !== modifiedMatricNo
  );

  // Filter out the course from the student's courses list
  student.courses = student.courses.filter(
    (courseId) => courseId.toString() !== course._id.toString()
  );

  if (student.courses.length === 0) {
    // Store the student and course information in the response to handle the fingerprint removal
    res.status(200).json({
      message: `Student with ${modifiedMatricNo} is pending fingerprint removal before complete disenrollment`,
      pendingRemoval: true,
      matricNo: modifiedMatricNo,
    });
  } else {
    // Save the updated student
    await student.save();

    // Save the updated course with the removed student
    await course.save();

    // Send the updated list of students as a response
    res.status(200).json({
      message: `Student with ${modifiedMatricNo} has been disenrolled successfully`,
      students: course.students,
    });
  }
});

exports.getStudentOtherDetails = catchAsync(async (req, res, next) => {
  const { courseCode, matricNo } = req.params;
  console.log(
    "Getting Other Student Details for",
    courseCode,
    "matricNo",
    matricNo
  );

  // Step 1: Find the student by matriculation number and populate the courses field
  const student = await Student.findOne({
    matricNo: matricNo.replace("_", "/"),
  }).populate({
    path: "courses",
    populate: [
      {
        path: "students",
        model: "Student",
      },
      {
        path: "lecturer",
        model: "Lecturer",
      },
    ],
  });
  console.log("Student", student);

  if (!student) {
    return res.status(404).json({ message: "Student not found" });
  }

  // Initialize variables to store overall attendance details
  let totalAttendanceCount = 0;
  let totalPossibleAttendanceCount = 0;

  // Step 2: Compute attendance for each course
  const courseAttendances = await Promise.all(
    student.courses.map(async (course) => {
      // Fetch attendance records for the course
      const attendanceRecords = await Attendance.find({
        course: course._id,
      });

      // Filter attendance records to count only those where the student is present
      const studentAttendanceCount = attendanceRecords.filter((record) =>
        record.studentsPresent.some((sp) => sp.student.equals(student._id))
      ).length;

      // Compute attendance percentage for the course
      const attendancePercentage =
        (studentAttendanceCount / attendanceRecords.length) * 100;

      // Update overall attendance details
      totalAttendanceCount += studentAttendanceCount;
      totalPossibleAttendanceCount += attendanceRecords.length;

      // Return course attendance details
      return {
        courseCode: course.courseCode,
        courseName: course.courseName,
        attendancePercentage,
      };
    })
  );

  // Step 3: Compute overall attendance for the student
  const overallAttendancePercentage =
    totalPossibleAttendanceCount > 0
      ? (totalAttendanceCount / totalPossibleAttendanceCount) * 100
      : 0;

  console.log("courseAttendances", courseAttendances);

  // Return results
  res.status(200).json({
    courses: student.courses,
    courseAttendances,
    overallAttendancePercentage,
  });
});
