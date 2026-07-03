const SystemLogModel = {
  async create(supabase, payload = {}) {
    const { data, error } = await supabase
      .from("system_logs")
      .insert({
        actor_id: payload.actorId || null,
        actor_role: payload.actorRole || null,
        action: payload.action,
        module: payload.module,
        entity_type: payload.entityType || null,
        entity_id: payload.entityId || null,
        status: payload.status || "success",
        severity: payload.severity || "info",
        message: payload.message || null,
        metadata: payload.metadata || null,
        ip_address: payload.ipAddress || null,
        user_agent: payload.userAgent || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async findAll(supabase, filters = {}) {
    const page = Number(filters.page || 1);
    const limit = Math.min(Number(filters.limit || 20), 100);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("system_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (filters.module) query = query.eq("module", filters.module);
    if (filters.action) query = query.eq("action", filters.action);
    if (filters.status) query = query.eq("status", filters.status);
    if (filters.severity) query = query.eq("severity", filters.severity);
    if (filters.actorId) query = query.eq("actor_id", filters.actorId);
    if (filters.entityType) query = query.eq("entity_type", filters.entityType);
    if (filters.entityId) query = query.eq("entity_id", filters.entityId);

    if (filters.fromDate) query = query.gte("created_at", filters.fromDate);
    if (filters.toDate) query = query.lte("created_at", filters.toDate);

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      rows: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit),
      },
    };
  },

  async findById(supabase, id) {
    const { data, error } = await supabase
      .from("system_logs")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },
};

module.exports = SystemLogModel;
