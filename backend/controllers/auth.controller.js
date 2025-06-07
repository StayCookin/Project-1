const prisma = require("../utils/prisma");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken"); // Import jsonwebtoken

const registerUser = async (req, res) => {
  // ... your existing registerUser function ...
};

// --- ADD THE NEW FUNCTION BELOW ---

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
  loginUser,
  getCurrentUser, // Export the new function
};
