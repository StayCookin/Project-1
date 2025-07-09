// utils/sendEmail.js
const nodemailer = require("nodemailer");
require("dotenv").config();

/**
 * Creates a Nodemailer transporter based on environment.
 * In development, it uses Ethereal for testing.
 * In production, it uses the configured SMTP service from environment variables.
 * @returns {Promise<nodemailer.Transporter>} A Nodemailer transporter instance.
 */
const createTransporter = async () => {
  if (process.env.NODE_ENV === "production") {
    // Production: Use actual SMTP service configured via environment variables
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Development: Use Ethereal Email for testing
    try {
      let testAccount = await nodemailer.createTestAccount();
      console.log("Ethereal Test Account Details (Development Only):");
      console.log("User:", testAccount.user);
      console.log("Pass:", testAccount.pass);
      console.log("SMTP Host:", testAccount.smtp.host);
      console.log("SMTP Port:", testAccount.smtp.port);
      console.log("SMTP Secure:", testAccount.smtp.secure);

      return nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    } catch (error) {
      console.error("Failed to create Ethereal test account:", error);
      throw new Error(
        "Could not create Ethereal test account for development email."
      );
    }
  }
};

/**
 * Sends an email using the configured Nodemailer transporter.
 * @param {string} to - Recipient email address.
 * @param {string} subject - Subject line of the email.
 * @param {string} htmlContent - HTML content of the email body.
 * @param {string} [textContent=''] - Optional plain text content for the email.
 * @returns {Promise<object>} Information about the sent message.
 */
const sendEmail = async (to, subject, htmlContent, textContent = "") => {
  try {
    const transporter = await createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM || '"InRent" <noreply@inrent.com>',
      to: to,
      subject: subject,
      html: htmlContent,
      text: textContent,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Message sent: %s", info.messageId);

    // Log preview URL for Ethereal in development
    if (
      process.env.NODE_ENV !== "production" &&
      nodemailer.getTestMessageUrl(info)
    ) {
      console.log(
        "Email Preview URL (Development Only): %s",
        nodemailer.getTestMessageUrl(info)
      );
    }
    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error(`Failed to send email to ${to}: ${error.message}`);
  }
};

module.exports = sendEmail;
