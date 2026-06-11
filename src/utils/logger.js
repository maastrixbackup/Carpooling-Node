const logError = (label, error) => {
  console.error(
    `\x1b[31m[ERROR]\x1b[0m ${label}:`,
    error?.message || error
  );
};

const logSuccess = (message) => {
  console.log(`\x1b[32m[SUCCESS]\x1b[0m ${message}`);
};

const logInfo = (message) => {
  console.log(`\x1b[36m[INFO]\x1b[0m ${message}`);
};

module.exports = {
  logError,
  logSuccess,
  logInfo,
};