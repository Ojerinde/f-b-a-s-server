const { string } = require("joi");
const { Lecturer, Course, Student } = require("../models/appModel");
const catchAsync = require("../utils/catchAsync");
const Email = require("../utils/email");

// Endpoint for enrolling a student into a course with WebSocket.
exports.enrollStudentWithWebsocket = catchAsync(
  async (ws, clients, payload) => {
    console.log("Starting enrollment process with WebSocket for", payload);

    const { courseCode, name, matricNo } = payload;

    // Find the course by its course code
    const course = await Course.findOne({ courseCode });

    if (!course) {
      return clients.forEach((client) => {
        client.send(
          JSON.stringify({
            event: "enroll_feedback",
            payload: {
              message: `Course ${courseCode} does not exist`,
              error: true,
            },
          })
        );
      });
    }

    // Find or create a student by matricNo
    let student = await Student.findOne({ matricNo });

    if (student) {
      if (student.name !== name) {
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

      // Student exists and is not enrolled in this course
      student.courses.push(course._id);
      await student.save();
      course.students.push(student._id);
      await course.save();

      // Send Mail to student
      await new Email(student, "").sendEnrollmentSuccessful(course.courseCode);

      return clients.forEach((client) => {
        client.send(
          JSON.stringify({
            event: "enroll_feedback",
            payload: {
              message: `Student with Matric No. ${student.matricNo} successfully enrolled for course ${course.courseCode}`,
              error: false,
            },
          })
        );
      });
    } else {
      // Find an available proposedId between 1 and 299
      let proposedId;
      for (let i = 1; i <= 299; i++) {
        const idExists = await Student.findOne({ idOnSensor: i });
        if (!idExists) {
          proposedId = i;
          break;
        }
      }

      if (!proposedId) {
        return clients.forEach((client) => {
          client.send(
            JSON.stringify({
              event: "enroll_feedback",
              payload: {
                message: `No available ID on sensor`,
                error: true,
              },
            })
          );
        });
      }

      // Create the student with idOnSensor set to undefined
      student = new Student({
        name,
        email: `${matricNo
          .replace("/", "-")
          .toLowerCase()}@students.unilorin.edu.ng`,
        matricNo,
        idOnSensor: undefined,
        courses: [course._id],
      });
      await student.save();

      // Add the student to the course's list of enrolled students
      course.students.push(student._id);
      await course.save();

      // This will be only be triggered if the enrolment was not successful and which means idOnsensor was not set
      setTimeout(async () => {
        try {
          console.log(
            "Rolling back enrollment process for student with Matric No.",
            student.matricNo,
            "due to timeout"
          );
          // refetch the student from the database
          const createdStudent = await Student.findOne({
            matricNo: student.matricNo,
          });

          if (!createdStudent.idOnSensor) {
            console.log(
              "Rolling back actions for student with Matric No.",
              createdStudent.matricNo
            );

            // Rollback actions: Delete the created student and remove from course
            if (createdStudent) {
              await Course.updateMany(
                { students: createdStudent._id },
                { $pull: { students: createdStudent._id } }
              );
              await Student.findByIdAndDelete(createdStudent._id);

              // Send response to the frontend with success message
              clients.forEach((client) => {
                client.send(
                  JSON.stringify({
                    event: "enroll_feedback",
                    payload: {
                      message: `Enrollment for student with Matric No. ${createdStudent.matricNo} failed`,
                      error: true,
                    },
                  })
                );
              });
            } else {
              console.error("Student not found in the database for rollback.");
            }
          } else {
            console.log("Student enrollment succeeded or already handled.");
          }
        } catch (error) {
          console.error("Error during enrollment rollback:", error);
        }
      }, 60000);

      // Emit an 'enroll' event to ESP32 device
      return clients.forEach((client) => {
        client.send(
          JSON.stringify({
            event: "enroll_request",
            payload: {
              courseCode,
              matricNo,
              proposedId: `${proposedId}`,
            },
          })
        );
      });
    }
  }
);

// Endpoint for receiving feedback from ESP32 device after enrollment
exports.getEnrollFeedbackFromEsp32 = catchAsync(
  async (ws, clients, payload) => {
    console.log("Enrollment feedback received from ESP32 device:", payload);

    const { courseCode, matricNo, idOnSensor } = payload?.data || {};

    // Regular expressions for validation
    const courseCodeRegex = /^[A-Z]{3}\s\d{3}$/; // Matches "ABC 000" format
    const matricNoRegex = /^\d{2}\/\d{2}[A-Z]{2}\d{3}$/; // Matches "18/30GC056" format
    // const idOnSensorRegex = /^\d+$/; // Matches any positive integer

    // Validate courseCode format
    if (!courseCode || !courseCodeRegex.test(courseCode)) {
      // If courseCode is missing or not in expected format, emit an error
      return clients.forEach((client) => {
        client.send(
          JSON.stringify({
            event: "enroll_feedback",
            payload: {
              message: "Invalid courseCode format received from device",
              error: true,
            },
          })
        );
      });
    }

    // Validate matricNo format
    if (!matricNo || !matricNoRegex.test(matricNo)) {
      return clients.forEach((client) => {
        client.send(
          JSON.stringify({
            event: "enroll_feedback",
            payload: {
              message: "Invalid matricNo format received from device",
              error: true,
            },
          })
        );
      });
    }

    // Validate idOnSensor format
    // if (!idOnSensor || !idOnSensorRegex.test(idOnSensor)) {
    //   return clients.forEach((client) => {
    //     client.send(
    //       JSON.stringify({
    //         event: "enroll_feedback",
    //         payload: {
    //           message: "Invalid idOnSensor format received from device",
    //           error: true,
    //         },
    //       })
    //     );
    //   });
    // }

    // Find the student by matricNo
    let student = await Student.findOne({ matricNo });
    let course = await Course.findOne({ courseCode });

    if (payload.error) {
      // Rollback actions: Delete the created student and remove from course
      await Course.updateMany(
        { students: student._id },
        { $pull: { students: student._id } }
      );
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
    }

    if (payload?.data?.message === "Place finger") {
      // Send response to the frontend with error message
      return clients.forEach((client) => {
        client.send(
          JSON.stringify({
            event: "enroll_feedback",
            payload: {
              message: `${payload.data.matricNo} should place the finger to be enrolled on the sensor`,
              error: false,
            },
          })
        );
      });
    }

    // Update fingerprint Id on Sensor and add course to student
    if (!student.courses.includes(course._id)) {
      student.courses.push(course._id);
    }
    student.idOnSensor = idOnSensor;
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
);
