exports.generateEmailVerificationHTML = function (
  firstName,
  emailVerificationURL
) {
  return `
      <!DOCTYPE html>
      <html>
      <head>
          <title>Automated Biometric Based Attendance System Email Verification</title>
      </head>
      <body>
            <h1 style="color: #181a40; font-size: 24px; font-weight: bold;">Hello, ${firstName}.</h1>
            <p style="color: #666; font-size: 16px;">Click the link below to verify your email:</p>
            <a href="${emailVerificationURL}" style="background-color: #007bff; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; font-size: 16px;">Verify Email</a>
      </body>
      </html>
      `;
};

exports.generateResetPasswordHTML = function (firstName, resetPasswordUrl) {
  return `
      <!DOCTYPE html>
      <html>
      <head>
            <title>Automated Biometric Based Attendance System Email Verification</title>
      </head>
      <body>
      <h1 style="color: #181a40; font-size: 24px; font-weight: bold;">Password Reset</h1>
      <p style="color: #666; font-size: 16px;">Hello ${firstName},</p>
      <p style="color: #666; font-size: 16px;">We received a request to reset your password. If you did not make this request, please ignore this email.</p>
      <p style="color: #666; font-size: 16px;">To reset your password, please click the following link:</p>
      <a href="${resetPasswordUrl}" style="background-color: #007bff; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; font-size: 16px; margin-bottom: 10px;">Reset Password</a>
      <p style="color: #666; font-size: 16px;">If the above link doesn't work, copy and paste the following URL into your browser's address bar:</p>
      <p style="color: #666; font-size: 16px; margin-bottom: 10px;">${resetPasswordUrl}</p>
      <p style="color: #666; font-size: 16px;">This link will expire in 10 minutes.</p>
      <p style="color: #666; font-size: 16px;">Thank you,</p>
      <p style="color: #666; font-size: 16px;">Attendance System</p>
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
      <body style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px;">
            <h1 style="color: #333; font-size: 24px; font-weight: bold; margin-bottom: 10px;">Password Reset Successful</h1>
            <p style="color: #666; font-size: 16px; margin-bottom: 10px;">Your password has been successfully reset.</p>
            <p style="color: #666; font-size: 16px; margin-bottom: 10px;">You can now use your new password to log in.</p>
            <p style="color: #666; font-size: 16px; margin-bottom: 10px;">Should you have any additional questions or concerns, please don't hesitate to reach out to our dedicated support team.</p>
            <p style="color: #666; font-size: 16px; margin-bottom: 10px;">Thank you for choosing Attendance System!</p>
      </body>
      </html>
      `;
};

exports.generateEnrollmentSuccessHTML = function (courseCode) {
  return `
          <html>
          <head>
              <title>Enrollment Successful</title>
          </head>
          <body style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px;">
                <h1 style="color: #333; font-size: 24px; font-weight: bold; margin-bottom: 10px;">Successful Enrollment</h1>
                <p style="color: #666; font-size: 16px; margin-bottom: 10px;">YYou have successfully been enrolled for ${courseCode}.</p>
                <p style="color: #666; font-size: 16px; margin-bottom: 10px;">Should you have any additional questions or concerns, please don't hesitate to reach out to our dedicated support team.</p>
                <p style="color: #666; font-size: 16px; margin-bottom: 10px;">Thank you for choosing Attendance System!</p>
          </body>
          </html>
          `;
};
