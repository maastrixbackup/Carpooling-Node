const { supabaseAdmin } = require("../config/supabase");
const SystemLogModel = require("../models/systemLog.model");

function getActorFromReq(req) {
  return {
    actorId: req.user?.id || null,
    actorRole:
      req.user?.appMetadata?.role ||
      req.user?.metadata?.role ||
      req.user?.role ||
      null,
  };
}

function getRequestMeta(req) {
  return {
    ipAddress:
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress ||
      null,
    userAgent: req.headers["user-agent"] || null,
  };
}

async function log(payload = {}) {
  if (!payload.action || !payload.module) {
    return null;
  }

  try {
    return await SystemLogModel.create(supabaseAdmin, payload);
  } catch (error) {
    console.error("[SYSTEM LOG FAILED]", {
      action: payload.action,
      module: payload.module,
      message: error?.message,
    });

    return null;
  }
}

async function logFromReq(req, payload = {}) {
  const actor = getActorFromReq(req);
  const requestMeta = getRequestMeta(req);
  return log({
    ...actor,
    ...requestMeta,
    ...payload,
  });
}

module.exports = {
  log,
  logFromReq,
};
