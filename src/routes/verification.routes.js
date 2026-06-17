const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");

const {
  getVerificationProfile,
  verifyPhoneSelf,
  submitAadhaar,
  submitBankDetails,
  assertCanRedeem,
  updateVerificationProfile
} = require("../controllers/verification.controller");

router.use(authMiddleware);

router.get("/me", getVerificationProfile);
router.post("/phone", verifyPhoneSelf);
router.post("/aadhaar", submitAadhaar);
router.post("/bank", submitBankDetails);
router.get("/can-redeem", assertCanRedeem);
router.post("/profile", updateVerificationProfile);

module.exports = router;