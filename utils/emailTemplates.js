exports.generateEmailVerificationHTML = function (
  firstName,
  emailVerificationURL
) {
  return `
      <!DOCTYPE html>
      <html>
      <head>
          <title>Attendance System Email Verification</title>
      </head>
      <body>
          <h1>Almost done, ${firstName}.</h1>
          <p>Click the link below to verify your email:</p>
          <a href=${emailVerificationURL}>Verify Email</a>
      </body>
      </html>
      `;
};

exports.generateResetPasswordHTML = function (firstName, resetPasswordUrl) {
  return `
      <!DOCTYPE html>
      <html>
      <head>
          <title>Attendance System  Account Password Reset</title>
      </head>
      <body>
          <h1>Password Reset</h1>
          <p>Hello ${firstName},</p>
          <p>We received a request to reset your password. If you did not make this request, please ignore this email.</p>
          <p>To reset your password, please click the following link:</p>
          <a href=${resetPasswordUrl}>Reset Password</a>
          <p>If the above link doesn't work, copy and paste the following URL into your browser's address bar:</p>
          <p>${resetPasswordUrl}</p>
          <p>This link will expire in 10 minutes.</p>
          <p>Thank you,</p>
          <p>Attendance System</p>
      </body>
      </html>
      `;
};

exports.generateResetPasswordSuccessHTML = function () {
  return `
      <html>
      <head>
          <title>Password Reset Successful</title>
      </head>
      <body>
          <h1>Password Reset Successful</h1>
          <p>Your password has been successfully reset.</p>
          <p>You can now use your new password to log in.</p>
          <p>If you have any further questions or concerns, please contact our support team.</p>
          <p>Thank you for using Attendance System!</p>
      </body>
      </html>
      `;
};
