const { supabaseAnon, supabaseAdmin, createUserSupabaseClient } = require("../config/supabase");

const AuthModel = {
  async signUp({ fullName, email, phone, password, role = "passenger" }) {
    const { data, error } = await supabaseAnon.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone,
          role,
        },
      },
    });

    if (error) throw error;

    return data;
  },

  async login({ email, password }) {
    const { data, error } = await supabaseAnon.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    return data;
  },

 async logout(accessToken) {
    const supabase = createUserSupabaseClient(accessToken);
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return true;
  },

  async getUserByToken(accessToken) {
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (error) throw error;

    return user;
  },

  async resetPassword(email) {
    const { data, error } = await supabaseAnon.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: process.env.SUPABASE_RESET_PASSWORD_REDIRECT_URL,
      },
    );

    if (error) throw error;

    return data;
  },

  async adminCreateUser({
    fullName,
    email,
    phone,
    password,
    role = "passenger",
  }) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        phone,
        role,
      },
    });

    if (error) throw error;

    return data;
  },

  async refreshSession(refreshToken) {
    const { data, error } = await supabaseAnon.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error) throw error;

    return data;
  },
};

module.exports = AuthModel;
