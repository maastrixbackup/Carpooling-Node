const crypto = require("crypto");

function normalizeAadhaar(value) {
  return String(value || "").replace(/\D/g, "");
}

function isValidAadhaar(value) {
  const aadhaar = normalizeAadhaar(value);
  return /^[2-9][0-9]{11}$/.test(aadhaar);
}

function hashAadhaar(value) {
  const aadhaar = normalizeAadhaar(value);

  return crypto
    .createHmac("sha256", process.env.AADHAAR_HASH_SECRET)
    .update(aadhaar)
    .digest("hex");
}

function getAadhaarLast4(value) {
  return normalizeAadhaar(value).slice(-4);
}

function getVerificationState(user) {
  const phoneDone = Boolean(user.phone_verified);
  const aadhaarDone = Boolean(user.aadhaar_hash);
  const bankDone = Boolean(
    user.bank_account_holder &&
      user.bank_account_number &&
      user.bank_account_ifsc &&
      user.bank_name,
  );

  const completed = phoneDone && aadhaarDone && bankDone;

  return {
    phoneDone,
    aadhaarDone,
    bankDone,
    completed,
    nextStep: !phoneDone
      ? "phone"
      : !aadhaarDone
        ? "aadhaar"
        : !bankDone
          ? "bank"
          : "completed",
  };
}

module.exports = {
  normalizeAadhaar,
  isValidAadhaar,
  hashAadhaar,
  getAadhaarLast4,
  getVerificationState,
};