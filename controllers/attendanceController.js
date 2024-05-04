const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const {
  Lecturer,
  Course,
  Student,
  Attendance,
} = require("../models/attendanceModel");

exports.createLecturer = catchAsync(async (req, res, next) => {
  console.log("Creating Lecturer with", req.body);

  // Check if the lecturer already exists based on email
  const existingLecturer = await Lecturer.findOne({ email: req.body.email });
  if (existingLecturer) {
    // If lecturer exists, update their selected courses
    // Get the initial list of courses for the lecturer from the database
    const existingCourses = existingLecturer.selectedCourses;

    const newCourses = req.body.courses;

    // Remove any courses from the initial list that are not in the new list
    const removedCourses = existingCourses.filter(
      (course) =>
        !newCourses.some(
          (newCourse) => newCourse.courseCode === course.courseCode
        )
    );

    // Remove courses from the database that are not in the new array
    await Lecturer.updateOne(
      { email: req.body.email },
      {
        $pull: {
          selectedCourses: {
            courseCode: {
              $in: removedCourses.map((course) => course.courseCode),
            },
          },
        },
      }
    );

    // Add any new courses from the new list that are not in the initial list
    const addedCourses = newCourses.filter(
      (newCourse) =>
        !existingCourses.some(
          (course) => course.courseCode === newCourse.courseCode
        )
    );

    // Save the updated list of courses back to the database
    await Lecturer.findOneAndUpdate(
      { email: req.body.email },
      { $push: { selectedCourses: { $each: addedCourses } } },
      { new: true }
    );

    // Refetch the updated list of courses from the database
    const updatedLecturer = await Lecturer.findOne({ email: req.body.email });

    // Respond with the updated list of courses
    res.status(200).json({ courses: updatedLecturer.selectedCourses });
  } else {
    // If lecturer doesn't exist, create a new one with all the courses
    const newLecturer = await Lecturer.create({
      name: req.body.name,
      email: req.body.email,
      selectedCourses: req.body.courses,
    });

    res.status(201).json(newLecturer);
  }
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
  const { courseCode } = req.params;

  // Find the course by its course code and populate the 'students' field to get student details
  const course = await Course.findOne({ courseCode }).populate("students");

  if (!course) {
    return new AppError("Course not found", 404);
  }

  res.status(200).json({ students: course.students });
});

// Endpoint for fetching attendance records for a course
exports.getAttendanceRecords = catchAsync(async (req, res, next) => {
  const { courseCode } = req.params;

  // Find the course by its course code
  const course = await Course.findOne({ courseCode });

  if (!course) {
    return new AppError("Course not found", 404);
  }

  // Retrieve the attendance records for the course
  const attendanceRecords = await Attendance.find({
    course: course._id,
  }).populate("studentsPresent");

  res.status(200).json({ attendanceRecords });
});

// Endpoint for deleting attendance records and enrolled students for a course
exports.deleteCourseData = catchAsync(async (req, res, next) => {
  const { courseCode } = req.params;

  // Find the course by its course code
  const course = await Course.findOne({ courseCode });

  if (!course) {
    return new AppError("Course not found", 404);
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

  // Save the updated course without enrolled students
  await course.save();

  res
    .status(200)
    .json({ message: `Course data for ${courseCode} has been resetted` });
});

// Endpoint for disenroll student for a course
exports.disenrollStudent = catchAsync(async (req, res, next) => {
  const { courseCode, matricNo } = req.params;
  console.log("courseCode", courseCode, matricNo);

  // Find the course by its course code
  const course = await Course.findOne({ courseCode }).populate("students");

  if (!course) {
    return res.status(404).json({ message: "Course not found" });
  }

  // Filter out the disenrolled student from the course's students list
  course.students = course.students.filter(
    (stu) => stu.matricNo !== matricNo.replace("_", "/")
  );

  // Save the updated course with the removed student
  await course.save();

  // Send the updated list of students as a response
  res.status(200).json({
    message: `Student with ${matricNo.replace(
      "_",
      "/"
    )} has been disenrolled successfully`,
    students: course.students,
  });
});

// Endpoint for disenroll student for a course
exports.getStudentOtherDetails = catchAsync(async (req, res, next) => {
  const { courseCode, matricNo } = req.params;
  console.log("courseCode", courseCode, matricNo);

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

  if (!student) {
    return new AppError("Student not found", 404);
  }

  // Initialize variables to store overall attendance details
  let totalAttendanceCount = 0;
  let totalPossibleAttendanceCount = 0;

  // Step 2: Compute attendance for each course
  const courseAttendances = await Promise.all(
    student.courses.map(async (course) => {
      // Fetch attendance records for the course and student
      const attendanceRecords = await Attendance.find({
        course: course._id,
        studentsPresent: student._id,
      });

      // Compute attendance percentage for the course
      const attendancePercentage =
        (attendanceRecords.length / course.attendance.length) * 100;

      // Update overall attendance details
      totalAttendanceCount += attendanceRecords.length;
      totalPossibleAttendanceCount += course.attendance.length;

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
    (totalAttendanceCount / totalPossibleAttendanceCount) * 100;

  console.log("courseAttendances", student.courses);

  // // Return results
  res.status(200).json({
    courses: student.courses,
    courseAttendances,
    overallAttendancePercentage,
  });
});
