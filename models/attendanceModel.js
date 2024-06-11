const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Define schema for Lecturer
const lecturerSchema = new Schema({
  name: String,
  email: String,
  selectedCourses: [
    {
      courseCode: String,
      courseName: String,
      noOfStudents: Number,
    },
  ],
});

// Define schema for Course
const courseSchema = new Schema({
  courseCode: String,
  courseName: String,
  noOfStudents: Number,
  lecturer: { type: Schema.Types.ObjectId, ref: "Lecturer" },
  students: [{ type: Schema.Types.ObjectId, ref: "Student" }],
  attendance: [{ type: Schema.Types.ObjectId, ref: "Attendance" }],
  startId: Number,
  endId: Number,
});

// Define schema for NoOfStudents
const noOfStudentsSchema = new Schema({
  department: String,
  noOfStudents: Number,
  startId: Number,
  endId: Number,
});

// Define schema for Student
const studentSchema = new Schema({
  name: String,
  email: String,
  matricNo: String,
  idOnSensor: Number,
  courses: [{ type: Schema.Types.ObjectId, ref: "Course" }],
});

// Define schema for Student Attendance
const studentAttendanceSchema = new Schema({
  student: { type: Schema.Types.ObjectId, ref: "Student" },
  time: String, // This will store the time the student took attendance
});

// Define schema for Attendance
const attendanceSchema = new Schema({
  date: Date,
  studentsPresent: [studentAttendanceSchema],
  course: { type: Schema.Types.ObjectId, ref: "Course" },
});

// Create models
const Lecturer = mongoose.model("Lecturer", lecturerSchema);
const Course = mongoose.model("Course", courseSchema);
const Student = mongoose.model("Student", studentSchema);
const Attendance = mongoose.model("Attendance", attendanceSchema);
const NoOfStudents = mongoose.model("NoOfStudents", noOfStudentsSchema);

module.exports = {
  Lecturer,
  Course,
  Student,
  Attendance,
  NoOfStudents,
};
