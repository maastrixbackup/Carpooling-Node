const { supabaseAdmin } = require("../../config/supabase");
const AccountModel = require("../../models/account/account.model");

function mapDeletionRequest(request) {
  if (!request) return null;

  return {
    id: String(request.id),
    userId: request.user_id,
    status: request.status,
    requestedAt: request.requested_at,
    scheduledDeleteAt: request.scheduled_delete_at,
    cancelledAt: request.cancelled_at,
    processedAt: request.processed_at,
  };
}

const getDeletionRequestStatus = async (req, res) => {
  try {
    const request = await AccountModel.findPendingDeletionRequest(
      supabaseAdmin,
      req.user.id,
    );

    return res.status(200).json({
      success: true,
      data: {
        deletionRequest: mapDeletionRequest(request),
      },
    });
  } catch (error) {
    console.error("[ERROR] Get deletion request:", {
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
      code: error?.code,
      stack: error?.stack,
    });

    return res.status(500).json({
      success: false,
      message: "Unable to fetch account deletion request.",
    });
  }
};

const requestAccountDeletion = async (req, res) => {
  try {
    const existingRequest = await AccountModel.findPendingDeletionRequest(
      supabaseAdmin,
      req.user.id,
    );

    if (existingRequest) {
      return res.status(409).json({
        success: false,
        message: "Account deletion request already exists.",
        data: {
          deletionRequest: mapDeletionRequest(existingRequest),
        },
      });
    }

    const request = await AccountModel.createDeletionRequest(
      supabaseAdmin,
      req.user.id,
    );

    await AccountModel.markUserDeletionRequested(
      supabaseAdmin,
      req.user.id,
      request,
    );

    return res.status(201).json({
      success: true,
      message:
        "Account deletion request submitted successfully. Your account is scheduled for deletion after 15 days.",
      data: {
        deletionRequest: mapDeletionRequest(request),
      },
    });
  } catch (error) {
    console.error("[ERROR] Request account deletion:", {
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
      code: error?.code,
      stack: error?.stack,
    });

    if (error?.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Account deletion request already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to request account deletion.",
    });
  }
};

const cancelAccountDeletion = async (req, res) => {
  try {
    const cancelled = await AccountModel.cancelDeletionRequest(
      supabaseAdmin,
      req.user.id,
    );

    if (!cancelled) {
      return res.status(404).json({
        success: false,
        message: "No active account deletion request found.",
      });
    }

    await AccountModel.clearUserDeletionRequested(supabaseAdmin, req.user.id);

    return res.status(200).json({
      success: true,
      message: "Account deletion request cancelled successfully.",
      data: {
        deletionRequest: mapDeletionRequest(cancelled),
      },
    });
  } catch (error) {
    console.error("[ERROR] Cancel account deletion:", {
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
      code: error?.code,
      stack: error?.stack,
    });

    return res.status(500).json({
      success: false,
      message: "Unable to cancel account deletion request.",
    });
  }
};

module.exports = {
  getDeletionRequestStatus,
  requestAccountDeletion,
  cancelAccountDeletion,
};