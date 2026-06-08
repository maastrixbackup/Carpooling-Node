const errorHandler = (err, req, res, next) => {
  console.error("SERVER_ERROR:", err);

  return res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal server error",
  });
};

module.exports = {
  errorHandler,
};