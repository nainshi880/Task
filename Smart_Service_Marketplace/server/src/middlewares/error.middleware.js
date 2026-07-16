const errorHandler = (
  err,
  req,
  res,
  next
) => {

  console.error(err);

  const status =
    err.statusCode || 500;

  res.status(status).json({
    success: false,
    message: err.message,
    stack:
      process.env.NODE_ENV ===
      "development"
        ? err.stack
        : undefined,
  });
};

export default errorHandler;