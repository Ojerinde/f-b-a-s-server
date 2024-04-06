const { Course, Student } = require("../models/attendanceModel");
const catchAsync = require("../utils/catchAsync");

// Endpoint for deleting enrolled student with Websocket.
exports.deleteEnrolledStudentsWithWebsocket = catchAsync(
  async (socket, data) => {
    console.log(
      "Starting delete enrolled students process with websocket for",
      data
    );

    const { courseCode, matricNo } = data;

    // Find the course by its course code
    const course = await Course.findOne({ courseCode });

    if (!course) {
      // If the course doesn't exist, return an error message
      return socket.emit(
        "delete_enrolled_students_feedback",
        "Course not found"
      );
    }

    // Find the student by their matriculation number
    const student = await Student.findOne({ matricNo });

    if (!student) {
      // If the student doesn't exist, return an error message
      return socket.emit(
        "delete_enrolled_students_feedback",
        "Student not found"
      );
    }

    // Check if the student is enrolled in the course
    if (!student.courses.includes(course._id)) {
      // If the student is not enrolled in the course, return an error message
      return socket.emit(
        "delete_enrolled_students_feedback",
        "Student is not enrolled in the course"
      );
    }
    // // TEST without ESP 32 Start
    // // Send response to the frontend with success message
    // return socket.emit(
    //   "delete_enrolled_students_feedback",
    //   "Student deleted from course successfully"
    // );
    // // TEST End

    // Emit a 'delete_enrolled_students' event to ESP32 device
    socket.emit("delete_enrolled_students", { matricNo, courseCode });

    // Wait for delete enrollment feedback from ESP32 device
    socket.on("delete_enrolled_students_feedback", async (feedback) => {
      console.log("Enrollment feedback received:", feedback);

      // If feedback indicates an error, rollback the enrollment process
      if (feedback.error) {
        // Send response to the frontend with error message
        return socket.emit(
          "delete_enrolled_students_feedback",
          "Enrollment failed"
        );
      } else {
        // Remove the student from the course's list of enrolled students
        course.students.pull(student._id);
        await course.save();

        // Remove the course from the student's list of enrolled courses
        student.courses.pull(course._id);
        await student.save();

        // Send response to the frontend with success message
        return socket.emit(
          "delete_enrolled_students_feedback",
          "Student deleted from course successfully"
        );
      }
    });
  }
);
