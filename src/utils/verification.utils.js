const crypto = require("crypto");

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function normalizePan(value) {
  return String(value || "").trim().toUpperCase().replace(/\s/g, "");
}

function isValidAadhaar(value) {
  const aadhaar = onlyDigits(value);
  return /^[2-9][0-9]{11}$/.test(aadhaar);
}

function isValidPan(value) {
  const pan = normalizePan(value);
  return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan);
}

function hashIdentity(value) {
  const secret = process.env.IDENTITY_HASH_SECRET;
  if (!secret) {
    throw new Error("IDENTITY_HASH_SECRET is missing in environment.");
  }
  return crypto
    .createHmac("sha256", secret)
    .update(String(value))
    .digest("hex");
}

function hashAadhaar(value) {
  return hashIdentity(onlyDigits(value));
}

function hashPan(value) {
  return hashIdentity(normalizePan(value));
}

function getAadhaarLast4(value) {
  return onlyDigits(value).slice(-4);
}

function getPanLast4(value) {
  return normalizePan(value).slice(-4);
}

function getVerificationState(user) {
  const profileDone = Boolean(user.full_name && user.city && user.state);

  const identityDone = Boolean(
    user.identity_hash ||
      user.aadhaar_hash ||
      user.pan_hash
  );

  const bankDone = Boolean(
    user.bank_account_holder &&
      user.bank_account_number &&
      user.bank_account_ifsc &&
      user.bank_name
  );

  const completed = profileDone && identityDone && bankDone;

  return {
    profileDone,
    identityDone,
    bankDone,
    completed,
    nextStep: !profileDone
      ? "profile"
      : !identityDone
        ? "identity"
        : !bankDone
          ? "bank"
          : "completed",
  };
}

module.exports = {
  onlyDigits,
  normalizePan,
  isValidAadhaar,
  isValidPan,
  hashAadhaar,
  hashPan,
  getAadhaarLast4,
  getPanLast4,
  getVerificationState,
};