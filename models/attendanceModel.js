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
    },
  ],
});

// Define schema for Course
const courseSchema = new Schema({
  courseCode: String,
  courseName: String,
  lecturer: { type: Schema.Types.ObjectId, ref: "Lecturer" },
  students: [{ type: Schema.Types.ObjectId, ref: "Student" }],
  attendance: [{ type: Schema.Types.ObjectId, ref: "Attendance" }],
});

// Define schema for Student
const studentSchema = new Schema({
  name: String,
  matricNo: String,
  courses: [{ type: Schema.Types.ObjectId, ref: "Course" }],
});

// Define schema for Attendance
const attendanceSchema = new Schema({
  date: Date,
  studentsPresent: [{ type: Schema.Types.ObjectId, ref: "Student" }],
  course: { type: Schema.Types.ObjectId, ref: "Course" },
});

// Create models
const Lecturer = mongoose.model("Lecturer", lecturerSchema);
const Course = mongoose.model("Course", courseSchema);
const Student = mongoose.model("Student", studentSchema);
const Attendance = mongoose.model("Attendance", attendanceSchema);

module.exports = {
  Lecturer,
  Course,
  Student,
  Attendance,
};
