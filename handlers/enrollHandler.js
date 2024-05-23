const { Lecturer, Course, Student } = require("../models/attendanceModel");
const catchAsync = require("../utils/catchAsync");
const Email = require("../utils/email");

// Endpoint for enrolling a student into a course with Websocket.
exports.enrollStudentWithWebsocket = catchAsync(async (ws, clients, data) => {
  console.log("Starting enrollment process with websocket for", data);
  // Find the lecturer by email to get the selected courses
  const lecturer = await Lecturer.findOne({
    email: data.lecturerEmail,
  });

  const { courseCode, courseName, name, matricNo } = data;

  // Find the course by its course code
  let course = await Course.findOne({ courseCode });

  if (!course) {
    // If the course doesn't exist, create it
    course = new Course({
      courseCode: courseCode,
      courseName: courseName,
      lecturer: lecturer._id,
      students: [],
      attendance: [],
    });
    await course.save();
  }

  // Find or create a student by matricNo
  let student = await Student.findOne({ matricNo });
  if (student && student.matricNo === matricNo && student.name !== name) {
    return clients.forEach((client) => {
      client.send(
        JSON.stringify({
          event: "enroll_feedback",
          payload: {
            message: `Student with Matric No. ${student.matricNo} already exists with a different name`,
            error: true,
          },
        })
      );
    });
  }

  if (student) {
    // If the student already exists, check if the current course has been already enrolled for
    if (student.courses.includes(course._id)) {
      return clients.forEach((client) => {
        client.send(
          JSON.stringify({
            event: "enroll_feedback",
            payload: {
              message: `Student with Matric No. ${student.matricNo} is already enrolled for this course`,
              error: true,
            },
          })
        );
      });
    }
  }

  // Emit an 'enroll' event to ESP32 device
  return clients.forEach((client) => {
    client.send(
      JSON.stringify({
        event: "enroll",
        payload: { name, matricNo, courseCode },
      })
    );
  });
});

// Endpoint for receiving feedback from ESP32 device after enrollment
exports.getEnrollFeedbackFromEsp32 = catchAsync(async (ws, clients, data) => {
  console.log("Enrollment feedback received from ESP32 device:", data);

  const { courseCode, name, matricNo, fingerprintHash } = data;

  let course = await Course.findOne({ courseCode });

  // Find the student by matricNo
  let student = await Student.findOne({ matricNo });

  const studentEmail = `${matricNo
    .replace("/", "-")
    .toLowerCase()}@students.unilorin.edu.ng`;

  if (!student) {
    student = new Student({
      name,
      email: studentEmail,
      matricNo,
      fingerprintHash: "",
      courses: [course._id],
    });
    await student.save();
  }

  if (student && student.matricNo === matricNo && student.name !== name) {
    return clients.forEach((client) => {
      client.send(
        JSON.stringify({
          event: "enroll_feedback",
          payload: {
            message: `Student with Matric No. ${student.matricNo} already exists with a different name`,
            error: true,
          },
        })
      );
    });
  }

  if (student) {
    // If the student already exists, check if the current course has been already enrolled for
    if (student.courses.includes(course._id)) {
      return clients.forEach((client) => {
        client.send(
          JSON.stringify({
            event: "enroll_feedback",
            payload: {
              message: `Student with Matric No. ${student.matricNo} is already enrolled for this course`,
              error: true,
            },
          })
        );
      });
    }
  }

  // If feedback indicates an error, rollback the enrollment process
  if (data.error) {
    // Rollback actions: Delete the created student and remove from course
    await Student.findByIdAndDelete(student._id);

    // Send response to the frontend with error message
    return clients.forEach((client) => {
      client.send(
        JSON.stringify({
          event: "enroll_feedback",
          payload: {
            message: `Enrollment for student with Matric No. ${student.matricNo} failed`,
            error: true,
          },
        })
      );
    });
  } else {
    // Add the student to the course's list of enrolled students
    course.students.push(student._id);
    await course.save();

    // Update fingerprint hash
    student.fingerprintHash = fingerprintHash;

    // Add the course to the student's list of enrolled courses
    student.courses.push(course._id);

    // Save the student to the database
    await student.save();

    // Send Mail to student
    await new Email(student, "").sendEnrollmentSuccessful(course.courseCode);

    // Send response to the frontend with success message
    return clients.forEach((client) => {
      client.send(
        JSON.stringify({
          event: "enroll_feedback",
          payload: {
            message: `Student with Matric No. ${student.matricNo} is successfully enrolled`,
            error: false,
          },
        })
      );
    });
  }
});
