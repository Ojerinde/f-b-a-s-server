const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const Email = require("../utils/email");
const User = require("../models/userModel");

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

const createSendToken = (user, statusCode, req, res) => {
  const token = signToken(user._id);

  // Send jwt as cookie to client
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 60 * 60 * 1000 // 24 hours
    ),
    httpOnly: true,
  };

  // Secure cookin for production
  if (process.env.NODE_ENV === "production") cookieOptions.secure = true;

  // sends jwt as cookie to the client
  res.cookie("jwt", token, cookieOptions);

  //  Remove password from the output
  user.password = undefined;

  return res.status(statusCode).json({
    success: true,
    token,
    data: {
      user,
    },
  });
};

const sendVerificationEmail = async (user, req, res, next) => {
  const emailVerificationToken = user.genEmailVerificationToken();
  await user.save({ validateBeforeSave: false }); // To save the emailVerification token and expires from the genEmailVerification method.

  const emailVerificationUrl = `${process.env.CLIENT_URL}/verify_email/${emailVerificationToken}`;
  console.log("Email Verification ", emailVerificationUrl);

  try {
    await new Email(user, emailVerificationUrl).sendEmailVerification();
    console.log("Email Sent");

    return res.status(201).json({
      success: true,
      message: `A verification mail has been sent to ${user.email}`,
    });
  } catch (error) {
    console.log("Email Sent failed");
    user.emailVerificationToken = undefined;
    user.emailVerificationTokenExpiresIn = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      new AppError("There was an error sending the email. Try again later!"),
      500
    );
  }
};

exports.signup = catchAsync(async (req, res, next) => {
  console.log("Signing up for ", req.body.email);
  // 1. Check if user exist
  const checkUser = await User.findOne({ email: req.body.email });
  if (checkUser) {
    return next(new AppError("User with email already exist.", 400));
  }

  // 2. Create a user, set verify to false until the user verify the email.
  const unverifiedUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
  });

  // 3. Send a mail for email verification and update verified state upon email verification
  return await sendVerificationEmail(unverifiedUser, req, res, next);
});

exports.verifyEmail = catchAsync(async (req, res, next) => {
  const { emailVerificationToken } = req.params;
  const hashedToken = crypto
    .createHash("sha256")
    .update(emailVerificationToken)
    .digest("hex");

  const unverifiedUser = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationTokenExpiresIn: { $gt: Date.now() },
  });

  if (!unverifiedUser)
    return next(
      new AppError(
        "Email verification link is invalid or has expired. Sign up again to get a new link.",
        400
      )
    );

  unverifiedUser.verified = true;
  unverifiedUser.emailVerificationToken = undefined;
  unverifiedUser.emailVerificationTokenExpiresIn = undefined;
  unverifiedUser.save({ validateBeforeSave: false });

  return res.status(200).json({
    success: true,
    message: "Email veirification successful, Proceed to Log in",
  });
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password: claimedCorrectPassword } = req.body;

  // 1. Confirm the payload
  if (!email || !claimedCorrectPassword)
    return next(
      new AppError(
        `We need both your email and password to let you into the club!" 😄🔐📧`,
        400
      )
    );

  // 2. Check if the user exist anf confirm the password
  const claimedUser = await User.findOne({ email }).select(
    "+password +verified"
  );

  if (!claimedUser.verified) {
    return next(
      new AppError(
        `Your email has not been verified yet. Please check your inbox for a verification email`
      )
    );
  }

  if (
    !claimedUser ||
    !(await claimedUser.correctPassword(claimedCorrectPassword))
  ) {
    return next(
      new AppError(
        "Oh dear! Seems like either your email or password is wrong.",
        400
      )
    );
  }

  // 3. Create and send a token
  createSendToken(claimedUser, 200, req, res);
});

exports.forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    return next(new AppError(`User with email, ${email} does not exist!`, 404));
  }

  const resetToken = user.genPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  const resetPasswordUrl = `${process.env.CLIENT_URL}/reset_password/${resetToken}`;

  try {
    await new Email(user, resetPasswordUrl).sendPasswordReset();

    return res.status(200).json({
      status: "success",
      message: `A password reset mail has been sent to ${user.email}`,
    });
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetTokenExpiresIn = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      new AppError("There was an error sending the email. Try again later!"),
      500
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token
  const { token } = req.params;
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetTokenExpiresIn: { $gt: Date.now() }, // this confirms that the token hasn't expired
  });

  // 2) If token has not expired, and there is user, set the new password
  if (!user) {
    return next(new AppError("Token is invalid or has expired", 400));
  }

  const { password, confirmPassword } = req.body;
  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetTokenExpiresIn = undefined;

  await user.save();
  // 3) Update passwordModifiedAt property for the user

  // 4) Send password reset success email
  const resetPasswordUrl = `${process.env.CLIENT_URL}/reset_password/${token}`;

  try {
    await new Email(user, resetPasswordUrl).sendPasswordResetSuccess();

    return res.status(200).json({
      status: "success",
      message: `Account Password Reset Successful`,
    });
  } catch (error) {
    return next(
      new AppError("There was an error sending the email. Try again later!"),
      500
    );
  }
});
