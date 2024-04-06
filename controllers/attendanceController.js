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


// Endpoint for enrolling a student into a course
// exports.enrollStudent = catchAsync(async (req, res, next) => {
//   console.log("Starting enrollment process");
//   // Find the lecturer by email to get the selected courses
//   const lecturer = await Lecturer.findOne({
//     email: req.params.lecturerEmail,
//   });

//   const { courseCode, courseName, name, matricNo } = req.body;

//   // Find the course by its course code
//   let course = await Course.findOne({ courseCode });

//   if (!course) {
//     // If the course doesn't exist, create it
//     course = new Course({
//       courseCode: courseCode,
//       courseName: courseName,
//       lecturer: lecturer._id,
//       students: [],
//       attendance: [],
//     });
//     await course.save();
//   }

//   // Find or create a student by matricNo
//   let student = await Student.findOne({ matricNo });

//   if (!student) {
//     student = new Student({
//       name,
//       matricNo,
//       courses: [course._id],
//     });
//     await student.save();
//   } else {
//     // If the student already exists, check if the current course is already enrolled
//     if (!student.courses.includes(course._id)) {
//       student.courses.push(course._id); // Add the current course to the array of courses
//       await student.save();
//     }
//   }

//   // Add the student to the course's list of enrolled students
//   course.students.push(student._id);
//   await course.save();
//   res.status(201).json({ message: "Student enrolled successfully" });
// });

// // Endpoint for taking attendance for a course
// exports.takeAttendance = catchAsync(async (req, res, next) => {
//   console.log("Started attendance marking process");

//   const { courseCode, matricNo } = req.body;

//   // Find the course by its course code
//   const course = await Course.findOne({ courseCode });

//   // Find the student by their matriculation number
//   const student = await Student.findOne({ matricNo });

//   if (!student) {
//     return new AppError("Student not found", 404);
//   }

//   // Check if the student is enrolled in the course
//   if (!student.courses.includes(course._id)) {
//     return new AppError("Student is not enrolled in the course", 400);
//   }

//   // Check if attendance for the current date already exists
//   const today = new Date();
//   const startOfDay = new Date(
//     today.getFullYear(),
//     today.getMonth(),
//     today.getDate()
//   );
//   const endOfDay = new Date(
//     today.getFullYear(),
//     today.getMonth(),
//     today.getDate() + 1
//   );

//   const existingAttendance = await Attendance.findOne({
//     course: course._id,
//     date: { $gte: startOfDay, $lt: endOfDay },
//   });

//   if (existingAttendance) {
//     // Check if the student has already been marked present
//     if (existingAttendance.studentsPresent.includes(student._id)) {
//       return new AppError(
//         "Attendance has already been marked for this student today",
//         400
//       );
//     } else {
//       // Mark the student as present in the existing attendance record
//       existingAttendance.studentsPresent.push(student._id);
//       await existingAttendance.save();
//       return res
//         .status(201)
//         .json({ message: "Attendance recorded successfully" });
//     }
//   }

//   // Create a new attendance record for the current date
//   const newAttendance = new Attendance({
//     course: course._id,
//     date: today,
//     studentsPresent: [student._id],
//   });
//   await newAttendance.save();

//   // Update the attendance property in the Course schema
//   course.attendance.push(newAttendance._id);
//   await course.save();

//   res.status(201).json({ message: "Attendance recorded successfully" });
// });

