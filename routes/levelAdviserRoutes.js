const express = require("express");
const levelAdviserAuthController = require("../controllers/levelAdviserAuthController");
const {
  forgotPasswordValidator,
  resetPasswordValidator,
} = require("../utils/validators");

const router = express.Router();

router.post("/signup", levelAdviserAuthController.signup);
router.post("/signin", levelAdviserAuthController.login);
router.patch(
  "/verifyEmail/:emailVerificationToken",
  levelAdviserAuthController.verifyEmail
);
router.post(
  "/forgotPassword",
  forgotPasswordValidator,
  levelAdviserAuthController.forgotPassword
);
router.patch(
  "/resetPassword/:token",
  resetPasswordValidator,
  levelAdviserAuthController.resetPassword
);

router.patch("/updatePassword", levelAdviserAuthController.updatePassword);

router.patch(
  "/deactivateAccount",
  levelAdviserAuthController.deactivateAccount
);

router.patch(
  "/reactivateAccount",
  levelAdviserAuthController.reactivateAccount
);

router.patch("/updatePhrase", levelAdviserAuthController.updatePhrase);
router.get("/getPhrase/:email", levelAdviserAuthController.fetchPhrase);

module.exports = router;
