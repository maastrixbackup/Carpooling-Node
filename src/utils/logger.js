function logError(scope, error) {
  console.error(`
=================================================
ERROR: ${scope}
=================================================
Message:
${error?.message}

Details:
${error?.details || "N/A"}

Hint:
${error?.hint || "N/A"}

Code:
${error?.code || "N/A"}

Stack:
${error?.stack || "N/A"}
=================================================
`);
}

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