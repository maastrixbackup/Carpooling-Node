const { supabaseAdmin } = require("../config/supabase");
const UserModel = require("../models/user.model");
const {
  isValidAadhaar,
  isValidPan,
  hashAadhaar,
  hashPan,
  getAadhaarLast4,
  getPanLast4,
  getVerificationState,
} = require("../utils/verification.utils");

function mapVerificationProfile(user) {
  const state = getVerificationState(user);

  const identityType =
    user.identity_type ||
    (user.aadhaar_hash ? "aadhaar" : user.pan_hash ? "pan" : null);

  const identityLast4 =
    user.identity_last4 ||
    user.aadhaar_last4 ||
    user.pan_last4 ||
    null;

  return {
    id: user.id,

    fullName: user.full_name,
    phone: user.phone,
    city: user.city,
    state: user.state,
    address: user.address,

    phoneVerified: user.phone_verified,

    identityType,
    identityLast4,
    identityVerified:
      user.aadhaar_verification_status === "approved" ||
      user.pan_verification_status === "approved",

    aadhaarLast4: user.aadhaar_last4,
    aadhaarVerified: user.aadhaar_verification_status === "approved",

    panLast4: user.pan_last4,
    panVerified: user.pan_verification_status === "approved",

    bankAccountHolder: user.bank_account_holder,
    bankAccountNumber: user.bank_account_number,
    bankAccountIfsc: user.bank_account_ifsc,
    bankName: user.bank_name,
    bankVerified: user.bank_verification_status === "approved",

    isVerified: user.is_verified,
    canRedeem: user.can_redeem,

    verificationStatus: user.verification_status,
    onboardingStep: user.onboarding_step,
    onboardingCompleted: user.onboarding_completed,

    nextStep: state.nextStep,
  };
}

async function refreshVerificationStatus(userId) {
  const user = await UserModel.findDetailsById(supabaseAdmin, userId);

  if (!user) {
    throw new Error("User profile not found.");
  }

  const state = getVerificationState(user);

  const payload = {
    onboarding_step: state.nextStep,
    onboarding_completed: state.completed,
    is_verified: state.completed,
    verification_status: state.completed ? "approved" : "under_review",
    can_redeem: state.completed,
  };

  if (state.completed) {
    payload.bank_verification_status = "approved";

    if (user.identity_type === "aadhaar" || user.aadhaar_hash) {
      payload.aadhaar_verification_status = "approved";
    }

    if (user.identity_type === "pan" || user.pan_hash) {
      payload.pan_verification_status = "approved";
    }
  }

  return UserModel.updateDetails(supabaseAdmin, userId, payload);
}

const getVerificationProfile = async (req, res) => {
  try {
    const user = await UserModel.findDetailsById(supabaseAdmin, req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User profile not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        verification: mapVerificationProfile(user),
      },
    });
  } catch (error) {
    console.error("[ERROR] Get verification profile:", error?.message || error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch verification profile.",
    });
  }
};

const verifyPhoneSelf = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone || String(phone).replace(/\D/g, "").length < 10) {
      return res.status(400).json({
        success: false,
        message: "Valid phone number is required.",
      });
    }

    await UserModel.markPhoneVerified(supabaseAdmin, req.user.id, phone);

    const updated = await refreshVerificationStatus(req.user.id);

    return res.status(200).json({
      success: true,
      message: "Phone verified successfully.",
      data: {
        verification: mapVerificationProfile(updated),
      },
    });
  } catch (error) {
    console.error("[ERROR] Verify phone:", error?.message || error);

    return res.status(500).json({
      success: false,
      message: "Unable to verify phone.",
    });
  }
};

const submitAadhaar = async (req, res) => {
  req.body.identityType = "aadhaar";
  req.body.identityNumber = req.body.aadhaarNumber;
  return submitIdentity(req, res);
};

const submitBankDetails = async (req, res) => {
  try {
    const {
      bankAccountHolder,
      bankAccountNumber,
      bankAccountIfsc,
      bankName,
    } = req.body;

    if (
      !bankAccountHolder ||
      !bankAccountNumber ||
      !bankAccountIfsc ||
      !bankName
    ) {
      return res.status(400).json({
        success: false,
        message: "All bank details are required.",
      });
    }

    await UserModel.submitBank(supabaseAdmin, req.user.id, {
      bankAccountHolder,
      bankAccountNumber,
      bankAccountIfsc,
      bankName,
    });

    const updated = await refreshVerificationStatus(req.user.id);

    return res.status(200).json({
      success: true,
      message: "Bank details submitted successfully.",
      data: {
        verification: mapVerificationProfile(updated),
      },
    });
  } catch (error) {
    console.error("[ERROR] Submit bank:", error?.message || error);

    return res.status(500).json({
      success: false,
      message: "Unable to submit bank details.",
    });
  }
};

const assertCanRedeem = async (req, res) => {
  try {
    const user = await UserModel.findDetailsById(supabaseAdmin, req.user.id);

    if (!user?.can_redeem) {
      return res.status(403).json({
        success: false,
        message: "Complete verification before redeeming earnings.",
        data: {
          verification: user ? mapVerificationProfile(user) : null,
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: "User is eligible to redeem.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to verify redemption eligibility.",
    });
  }
};

const updateVerificationProfile = async (req, res) => {
  try {
    const { full_name, city, state, address } = req.body;

    if (!full_name || !city || !state) {
      return res.status(400).json({
        success: false,
        message: "Full name, city and state are required.",
      });
    }

    await UserModel.updateDetails(supabaseAdmin, req.user.id, {
      full_name: full_name.trim(),
      city: city.trim(),
      state: state.trim(),
      address: address || null,
      onboarding_step: "identity",
    });

    const updated = await refreshVerificationStatus(req.user.id);

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      data: {
        verification: mapVerificationProfile(updated),
      },
    });
  } catch (error) {
    console.error(
      "[ERROR] Update verification profile:",
      error?.message || error,
    );

    return res.status(500).json({
      success: false,
      message: "Unable to update profile.",
    });
  }
};

const submitIdentity = async (req, res) => {
  try {
    const { identityType, identityNumber } = req.body;

    if (!["aadhaar", "pan"].includes(identityType)) {
      return res.status(400).json({
        success: false,
        message: "Identity type must be aadhaar or pan.",
      });
    }

    let identityHash;
    let identityLast4;

    if (identityType === "aadhaar") {
      if (!isValidAadhaar(identityNumber)) {
        return res.status(400).json({
          success: false,
          message: "Please enter a valid Aadhaar number.",
        });
      }

      identityHash = hashAadhaar(identityNumber);
      identityLast4 = getAadhaarLast4(identityNumber);
    }

    if (identityType === "pan") {
      if (!isValidPan(identityNumber)) {
        return res.status(400).json({
          success: false,
          message: "Please enter a valid PAN number.",
        });
      }

      identityHash = hashPan(identityNumber);
      identityLast4 = getPanLast4(identityNumber);
    }

    await UserModel.submitIdentity(supabaseAdmin, req.user.id, {
      identityType,
      identityHash,
      identityLast4,
    });

    const updated = await refreshVerificationStatus(req.user.id);

    return res.status(200).json({
      success: true,
      message:
        identityType === "aadhaar"
          ? "Aadhaar submitted successfully."
          : "PAN submitted successfully.",
      data: {
        verification: mapVerificationProfile(updated),
      },
    });
  } catch (error) {
    console.error("[ERROR] Submit identity:", error?.message || error);

    return res.status(500).json({
      success: false,
      message: "Unable to submit identity.",
    });
  }
};


module.exports = {
  getVerificationProfile,
  verifyPhoneSelf,
  submitIdentity,
  submitAadhaar,
  submitBankDetails,
  assertCanRedeem,
  updateVerificationProfile,
};