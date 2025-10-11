import FormData from "form-data"; // form-data v4.0.1
import Mailgun from "mailgun.js"; // mailgun.js v11.1.0

async function sendSimpleMessage() {
  const mailgun = new Mailgun(FormData);
  const mg = mailgun.client({
    username: "api",
    key: process.env.API_KEY || "API_KEY",
    // When you have an EU-domain, you must specify the endpoint:
    // url: "https://api.eu.mailgun.net"
  });
  try {
    const data = await mg.messages.create("sandbox047c36c5c1934dd2a1718a82bda6bdc0.mailgun.org", {
      from: "Mailgun Sandbox <postmaster@sandbox047c36c5c1934dd2a1718a82bda6bdc0.mailgun.org>",
      to: ["Lethabo Swereki <lethaboswereki029@gmail.com>"],
      subject: "Hello Lethabo Swereki",
      text: "Congratulations Lethabo Swereki, you just sent an email with Mailgun! You are truly awesome!",
    });

    console.log(data); // logs response data
  } catch (error) {
    console.log(error); //logs any error
  }
}