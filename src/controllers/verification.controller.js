const { supabaseAdmin } = require("../config/supabase");
const UserModel = require("../models/user.model");
const {
  isValidAadhaar,
  hashAadhaar,
  getAadhaarLast4,
  getVerificationState,
} = require("../utils/verification.utils");

function mapVerificationProfile(user) {
  const state = getVerificationState(user);

  return {
    id: user.id,
    fullName: user.full_name,
    phone: user.phone,
    phoneVerified: user.phone_verified,
    aadhaarLast4: user.aadhaar_last4,
    aadhaarVerified: user.aadhaar_verification_status === "approved",
    bankVerified: user.bank_verification_status === "approved",
    isVerified: user.is_verified,
    canRedeem: user.can_redeem,
    onboardingStep: user.onboarding_step,
    onboardingCompleted: user.onboarding_completed,
    nextStep: state.nextStep,
  };
}

async function refreshVerificationStatus(userId) {
  const user = await UserModel.findDetailsById(supabaseAdmin, userId);
  const state = getVerificationState(user);

  const payload = {
    onboarding_step: state.nextStep,
    onboarding_completed: state.completed,
    is_verified: state.completed,
    verification_status: state.completed ? "approved" : "under_review",
    can_redeem: state.completed,
  };

  if (state.completed) {
    payload.aadhaar_verification_status = "approved";
    payload.bank_verification_status = "approved";
  }

  const updated = await UserModel.updateDetails(
    supabaseAdmin,
    userId,
    payload,
  );

  return updated;
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
  try {
    const { aadhaarNumber } = req.body;

    if (!isValidAadhaar(aadhaarNumber)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid Aadhaar number.",
      });
    }

    const aadhaarHash = hashAadhaar(aadhaarNumber);
    const aadhaarLast4 = getAadhaarLast4(aadhaarNumber);

    await UserModel.submitAadhaar(supabaseAdmin, req.user.id, {
      aadhaarHash,
      aadhaarLast4,
    });

    const updated = await refreshVerificationStatus(req.user.id);

    return res.status(200).json({
      success: true,
      message: "Aadhaar submitted successfully.",
      data: {
        verification: mapVerificationProfile(updated),
      },
    });
  } catch (error) {
    console.error("[ERROR] Submit Aadhaar:", error?.message || error);

    return res.status(500).json({
      success: false,
      message: "Unable to submit Aadhaar.",
    });
  }
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
      full_name,
      city,
      state,
      address: address || null,
      onboarding_step: "aadhaar",
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
    console.error("[ERROR] Update verification profile:", error?.message || error);

    return res.status(500).json({
      success: false,
      message: "Unable to update profile.",
    });
  }
};

module.exports = {
  getVerificationProfile,
  verifyPhoneSelf,
  submitAadhaar,
  submitBankDetails,
  assertCanRedeem,
  updateVerificationProfile
};