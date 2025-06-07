const jwt = require("jsonwebtoken");
const prisma = require("../utils/prisma"); // Changed to import our Prisma client

const auth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      // No token provided
      throw new Error("No token found");
    }

    // Verify the token using the secret key
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find the user in the database using the ID from the token
    // This is the main change from Mongoose to Prisma
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      // User belonging to this token no longer exists
      throw new Error("User not found");
    }

    // Note: I have commented out the 'invalidLoginDate' logic for now
    // as it's not yet in our Prisma schema. We can add this feature back
    // once we define it in the schema. This is a great custom feature to have!
    /*
        if (user.invalidLoginDate) {
            const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
            const timeSinceInvalidLogin = Date.now() - new Date(user.invalidLoginDate).getTime();
            
            if (timeSinceInvalidLogin > sevenDaysInMs) {
                return res.status(401).json({ 
                    message: 'Your verification period has expired. Please complete verification to continue.',
                    isExpired: true
                });
            }
        }
        */

    // Attach the user object to the request for use in other routes
    req.user = user;
    next(); // Proceed to the next middleware or the route handler
  } catch (error) {
    res.status(401).json({ message: "Please authenticate." });
  }
};

const checkRole = (roles) => {
  return (req, res, next) => {
    // This middleware assumes the `auth` middleware has already run
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: "You do not have permission to perform this action.",
      });
    }
    next();
  };
};

module.exports = { auth, checkRole };
