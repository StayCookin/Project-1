/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/https");
const logger = require("firebase-functions/logger");

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({maxInstances: 10});

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
// functions/index.js
const functions = require("firebase-functions");
const formData = require("form-data");
const Mailgun = require("mailgun.js");

const mailgun = new Mailgun(formData);
const mg = mailgun.client({
  username: "api",
  key: functions.config().mailgun.key, // Set via: firebase functions:config:set mailgun.key="YOUR_KEY"
});

const DOMAIN = "sandbox047c36c5c1934dd2a1718a82bda6bdc0.mailgun.org";

exports.sendVerificationEmail = functions.https.onCall(async (data, context) => {
  const {email, firstName, verificationLink} = data;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4F46E5; color: white; padding: 30px; text-align: center; }
        .content { background: #f9fafb; padding: 30px; }
        .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header"><h1>Welcome to InRent!</h1></div>
        <div class="content">
          <h2>Hi ${firstName},</h2>
          <p>Thank you for signing up! Please verify your email:</p>
          <a href="${verificationLink}" class="button">Verify Email</a>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const result = await mg.messages.create(DOMAIN, {
      from: "InRent <postmaster@sandbox047c36c5c1934dd2a1718a82bda6bdc0.mailgun.org>",
      to: [email],
      subject: "Verify Your InRent Account",
      html: htmlContent,
      text: `Hi ${firstName}, Please verify your email: ${verificationLink}`,
    });

    return {success: true, messageId: result.id};
  } catch (error) {
    console.error("Mailgun error:", error);
    throw new functions.https.HttpsError("internal", "Failed to send email");
  }
});

exports.sendAppointmentEmail = functions.https.onCall(async (data, context) => {
  const {email, firstName, appointmentDetails} = data;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4F46E5; color: white; padding: 30px; text-align: center; }
        .content { background: #f9fafb; padding: 30px; }
        .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header"><h1>Appointment Confirmation</h1></div>
        <div class="content">
          <h2>Hi ${firstName},</h2>
          <p>Your appointment has been scheduled:</p>
          <p>${appointmentDetails}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const result = await mg.messages.create(DOMAIN, {
      from: "InRent <postmaster@sandbox047c36c5c1934dd2a1718a82bda6bdc0.mailgun.org>",
      to: [email],
      subject: "Your InRent Appointment",
      html: htmlContent,
      text: `Hi ${firstName}, Your appointment has been scheduled: ${appointmentDetails}`,
    });

    return {success: true, messageId: result.id};
  } catch (error) {
    console.error("Mailgun error:", error);
    throw new functions.https.HttpsError("internal", "Failed to send email");
  }
});
