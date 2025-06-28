const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const rateLimit = require("express-rate-limit");
const multer = require("multer");
const path = require("path");
const User = require("../models/User");
const { auth } = require("../middleware/auth");

// Rate limiting middleware
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 registration requests per windowMs
  message: {
    message: "Too many registration attempts. Please try again later.",
  },
});
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 login requests per windowMs
  message: { message: "Too many login attempts. Please try again later." },
});

// Configure your transporter (use your real credentials)
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Multer storage config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === "studentId") {
      cb(null, path.join(__dirname, "../uploads/studentIds"));
    } else if (file.fieldname === "kycDoc") {
      cb(null, path.join(__dirname, "../uploads/kycDocs"));
    } else {
      cb(null, path.join(__dirname, "../uploads/other"));
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});
// Multer file filter and limits for studentId and kycDoc
const allowedMimeTypes = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/jpg",
];
const upload = multer({
  storage,
  fileFilter: function (req, file, cb) {
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, JPG, and PNG files are allowed."));
    }
  },
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max file size
});

const fs = require("fs");

// Register new user
router.post(
  "/register",
  registerLimiter,
  upload.fields([
    { name: "studentId", maxCount: 1 },
    { name: "kycDoc", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { name, email, password, role, phone, termsConsent } = req.body;
      // Backend validation
      if (!termsConsent || termsConsent !== "on") {
        // Remove uploaded files if validation fails
        if (req.files) {
          Object.values(req.files)
            .flat()
            .forEach((f) => fs.unlink(f.path, () => {}));
        }
        return res.status(400).json({
          message:
            "You must agree to the Terms & Conditions and Privacy Policy.",
        });
      }
      if (role === "STUDENT") {
        const uniPattern = /@.*\.ac\.bw$/i;
        if (!uniPattern.test(email)) {
          if (req.files) {
            Object.values(req.files)
              .flat()
              .forEach((f) => fs.unlink(f.path, () => {}));
          }
          return res.status(400).json({
            message:
              "Please use your university email address (ending with .ac.bw)",
          });
        }
        if (!req.files || !req.files.studentId) {
          if (req.files) {
            Object.values(req.files)
              .flat()
              .forEach((f) => fs.unlink(f.path, () => {}));
          }
          return res
            .status(400)
            .json({ message: "Student ID or admission letter is required." });
        }
      }
      // Landlord registration: skip KYC doc validation if not provided
      if (role === "LANDLORD") {
        // KYC doc is optional for landlords
        // No error thrown if missing
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        if (req.files) {
          Object.values(req.files)
            .flat()
            .forEach((f) => fs.unlink(f.path, () => {}));
        }
        return res.status(400).json({ message: "Email already registered" });
      }

      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString("hex");
      const verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

      // Save file paths if present
      let studentIdPath, kycDocPath;
      if (req.files && req.files.studentId) {
        studentIdPath = req.files.studentId[0].path;
      }
      if (req.files && req.files.kycDoc) {
        kycDocPath = req.files.kycDoc[0].path;
      }

      // Create new user
      const user = new User({
        name,
        email,
        password,
        role,
        phone,
        verificationToken,
        verificationTokenExpires,
        isVerified: false,
        studentIdPath: studentIdPath || undefined,
        kycDocPath: kycDocPath || undefined,
      });

      await user.save();

      // Send verification email
      const verifyUrl = `https://inrent.vercel/verify?token=${verificationToken}`;
      const mailOptions = {
        from: "your_email@gmail.com",
        to: user.email,
        subject: "Verify your InRent account",
        html: `<p>Click the link to verify your account:</p>\n                   <a href="${verifyUrl}">${verifyUrl}</a>`,
      };
      await transporter.sendMail(mailOptions);

      // Generate JWT token
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
        expiresIn: "7d",
      });

      res.status(201).json({
        message: "Registration successful. Please verify your email.",
      });
    } catch (error) {
      // Remove uploaded files if Multer or other error
      if (req.files) {
        Object.values(req.files)
          .flat()
          .forEach((f) => fs.unlink(f.path, () => {}));
      }
      // Multer file filter error
      if (
        error instanceof multer.MulterError ||
        error.message?.includes("Only PDF, JPG, and PNG files are allowed.")
      ) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Error registering user" });
    }
  }
);

// Login user
router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check if user is verified
    if (!user.isVerified) {
      return res
        .status(403)
        .json({ message: "Please verify your email first." });
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Error logging in" });
  }
});

// Verify email
router.get("/verify", async (req, res) => {
  const { token } = req.query;
  const user = await User.findOne({ verificationToken: token });
  if (!user) {
    return res.status(400).send("Invalid or expired verification link.");
  }
  user.isVerified = true;
  user.verificationToken = undefined;
  await user.save();
  // Redirect to login or dashboard
  res.redirect("/login.html?verified=1");
});

// Get current user
router.get("/me", auth, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        isVerified: req.user.isVerified,
        invalidLoginDate: req.user.invalidLoginDate,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching user data" });
  }
});

// Robust session handling and logout
router.post("/logout", (req, res) => {
  res.clearCookie("token");
  req.session?.destroy?.();
  res.status(200).json({ message: "Logged out successfully" });
});

// Robust session check endpoint
router.get("/session", (req, res) => {
  if (req.user) {
    res.json({ loggedIn: true, user: req.user });
  } else {
    res.json({ loggedIn: false });
  }
});

module.exports = router;
