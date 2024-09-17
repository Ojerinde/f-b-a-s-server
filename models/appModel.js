const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Define schema for Lecturer
const lecturerSchema = new Schema({
  name: String,
  email: String,
  title: String,
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
  email: String,
  matricNo: String,
  idOnSensor: Number,
  courses: [{ type: Schema.Types.ObjectId, ref: "Course" }],
});

// Define schema for Student Attendance
const studentAttendanceSchema = new Schema({
  student: { type: Schema.Types.ObjectId, ref: "Student" },
  time: String,
});

// Define schema for Attendance
const attendanceSchema = new Schema({
  date: Date,
  studentsPresent: [studentAttendanceSchema],
  course: { type: Schema.Types.ObjectId, ref: "Course" },
});

// Define schema for Device connected
const DevicesConnectedSchema = new Schema({
  deviceLocation: {
    type: String,
    unique: true,
    lowercase: true,
  },
});

// Define Schema For the
const LecturerDeviceLocationSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  deviceLocation: {
    type: String,
    required: true,
  },
});

// Define Schema For the
const OngoingRequestSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  courseCode: {
    type: String,
    required: true,
  },
  eventFeedbackName: {
    type: String,
    required: true,
  },
});

// Create models
const Lecturer = mongoose.model("Lecturer", lecturerSchema);
const Course = mongoose.model("Course", courseSchema);
const Student = mongoose.model("Student", studentSchema);
const Attendance = mongoose.model("Attendance", attendanceSchema);
const LecturerDeviceLocation = mongoose.model(
  "LecturerDeviceLocation",
  LecturerDeviceLocationSchema
);
const OngoingRequest = mongoose.model("OngoingRequest", OngoingRequestSchema);
const DevicesConnected = mongoose.model(
  "DevicesConnected",
  DevicesConnectedSchema
);

module.exports = {
  Lecturer,
  Course,
  Student,
  Attendance,
  DevicesConnected,
  LecturerDeviceLocation,
  OngoingRequest,
};
