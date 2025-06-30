const prisma = require("../utils/prisma");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { sendMail } = require("../utils/email");

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const registerUser = async (req, res) => {
  const { name, email, password, role, phone, school, studentId } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: "Missing required fields." });
  }
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing)
      return res.status(409).json({ error: "Email already registered." });
    const hashed = await bcrypt.hash(password, 10);
    const otp = generateOTP();
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        role,
        phone,
        school,
        studentId,
        isVerified: false,
        verificationToken: otp,
        verificationTokenExpires: new Date(Date.now() + 15 * 60 * 1000),
      },
    });
    await sendMail({
      to: email,
      subject: "InRent Email Verification Code",
      text: `Your verification code is: ${otp}`,
      html: `<p>Your InRent verification code is: <b>${otp}</b></p>`,
    });
    res.status(201).json({
      success: true,
      message: "User registered. Verification code sent to email.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Registration failed." });
  }
};

const verifyEmail = async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp)
    return res.status(400).json({ error: "Email and OTP required." });
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: "User not found." });
    if (user.isVerified)
      return res.status(400).json({ error: "Already verified." });
    if (
      user.verificationToken !== otp ||
      new Date() > user.verificationTokenExpires
    ) {
      return res.status(400).json({ error: "Invalid or expired OTP." });
    }
    await prisma.user.update({
      where: { email },
      data: {
        isVerified: true,
        verificationToken: null,
        verificationTokenExpires: null,
      },
    });
    res.json({
      success: true,
      message: "Email verified. You can now log in.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Verification failed." });
  }
};

const resendOtp = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required." });
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: "User not found." });
    if (user.isVerified)
      return res.status(400).json({ error: "Already verified." });
    const otp = generateOTP();
    await prisma.user.update({
      where: { email },
      data: {
        verificationToken: otp,
        verificationTokenExpires: new Date(Date.now() + 15 * 60 * 1000),
      },
    });
    await sendMail({
      to: email,
      subject: "InRent Email Verification Code (Resent)",
      text: `Your new verification code is: ${otp}`,
      html: `<p>Your new InRent verification code is: <b>${otp}</b></p>`,
    });
    res.json({ success: true, message: "Verification code resent to email." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to resend code." });
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;

  // Basic validation
  if (!email || !password) {
    return res
      .status(400)
      .json({ error: "Please provide both email and password." });
  }

  try {
    // 1. Find the user by their email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // User not found
      return res.status(401).json({ error: "Invalid credentials." });
    }

    if (!user.isVerified) {
      // Email not verified
      return res.status(403).json({ error: "Email not verified." });
    }

    // 2. Compare the provided password with the stored hash
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      // Passwords don't match
      return res.status(401).json({ error: "Invalid credentials." });
    }

    // 3. If passwords match, create the JWT payload
    const payload = {
      userId: user.id,
      role: user.role,
    };

    // 4. Sign the token
    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: "7d" } // Token will expire in 7 days
    );

    // 5. Send the token and user info back to the client
    const { password: _, ...userWithoutPassword } = user;
    res.status(200).json({
      message: "Login successful",
      token,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An internal server error occurred." });
  }
};

const getCurrentUser = async (req, res) => {
  // The 'auth' middleware has already run and attached the user object to the request.
  // We just need to send it back.
  // We create a new object to avoid sending back the hashed password.
  const { password, ...userWithoutPassword } = req.user;
  res.status(200).json(userWithoutPassword);
};

module.exports = {
  registerUser,
  verifyEmail,
  resendOtp,
  loginUser,
  getCurrentUser,
};
