// API entry for Vercel (if using serverless functions, not needed for Docker build)
module.exports = (req, res) => {
  res.status(200).json({ message: "API is working" });
};
