const { OngoingRequest } = require("../models/appModel");

exports.createOngoingRequest = async (email, courseCode, eventFeedbackName) => {
  const ongoingRequest = await OngoingRequest.create({
    email,
    courseCode,
    eventFeedbackName,
  });

  return ongoingRequest;
};
exports.findOngoingRequest = async (courseCode, eventFeedbackName) => {
  const ongoingRequest = await OngoingRequest.findOne({
    courseCode,
    eventFeedbackName,
  });

  return ongoingRequest;
};

exports.deleteOngoingRequest = async (courseCode, eventFeedbackName) => {
  const deletedRequest = await OngoingRequest.findOneAndDelete({
    courseCode,
    eventFeedbackName,
  });

  return deletedRequest;
};
