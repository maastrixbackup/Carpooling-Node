const { supabaseAdmin } = require("../config/supabase");

async function socketAuthMiddleware(socket, next) {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace("Bearer ", "");

    if (!token) {
      return next(new Error("SOCKET_UNAUTHORIZED"));
    }

    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return next(new Error("SOCKET_INVALID_TOKEN"));
    }

    socket.user = {
      id: user.id,
      email: user.email,
      metadata: user.user_metadata || {},
      appMetadata: user.app_metadata || {},
    };

    return next();
  } catch (error) {
    console.error("[SOCKET AUTH ERROR]", error?.message || error);
    return next(new Error("SOCKET_AUTH_FAILED"));
  }
}

module.exports = socketAuthMiddleware;