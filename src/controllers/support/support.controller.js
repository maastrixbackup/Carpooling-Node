const { supabaseAdmin } = require("../../config/supabase");
const SupportModel = require("../../models/support/support.model");

const SUPPORT_CATEGORIES = [
  {
    key: "ride_issue",
    label: "Ride Issue",
    description: "Problems related to published or completed rides.",
  },
  {
    key: "booking_issue",
    label: "Booking Issue",
    description: "Issues with passenger bookings or approvals.",
  },
  {
    key: "payment_rewards",
    label: "Payment / Rewards",
    description: "Payment, wallet, reward points or redeem issues.",
  },
  {
    key: "vehicle_verification",
    label: "Vehicle Verification",
    description: "Vehicle documents, RC upload or approval concerns.",
  },
  {
    key: "account_login",
    label: "Account / Login",
    description: "Login, profile, verification or account access issues.",
  },
  {
    key: "safety_concern",
    label: "Safety Concern",
    description: "Report unsafe behavior or urgent ride safety concerns.",
  },
  {
    key: "other",
    label: "Other",
    description: "Anything else not listed above.",
  },
];

function generateTicketNumber() {
  const date = new Date();

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");

  const random = Math.floor(1000 + Math.random() * 9000);

  return `SUP-${y}${m}${d}-${random}`;
}

function getPriority(category) {
  if (category === "safety_concern") return "urgent";
  if (category === "payment_rewards") return "high";
  return "normal";
}

function mapTicket(ticket) {
  return {
    id: String(ticket.id),
    ticketNumber: ticket.ticket_number,
    category: ticket.category,
    subject: ticket.subject,
    description: ticket.description,
    priority: ticket.priority,
    status: ticket.status,
    relatedRideId: ticket.related_ride_id ? String(ticket.related_ride_id) : null,
    relatedBookingId: ticket.related_booking_id
      ? String(ticket.related_booking_id)
      : null,
    adminNote: ticket.admin_note || null,
    resolvedAt: ticket.resolved_at || null,
    createdAt: ticket.created_at,
    updatedAt: ticket.updated_at,
    attachments: (ticket.support_ticket_attachments || []).map((item) => ({
      id: String(item.id),
      fileUrl: item.file_url,
      fileType: item.file_type,
      createdAt: item.created_at,
    })),
  };
}

const getSupportCategories = async (_req, res) => {
  return res.status(200).json({
    success: true,
    data: {
      categories: SUPPORT_CATEGORIES,
    },
  });
};

const createSupportTicket = async (req, res) => {
  try {
    const {
      category,
      subject,
      description,
      relatedRideId,
      relatedBookingId,
      attachments,
    } = req.body;

    const validCategories = SUPPORT_CATEGORIES.map((item) => item.key);

    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: "Valid support category is required.",
      });
    }

    if (!subject || String(subject).trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: "Subject must be at least 5 characters.",
      });
    }

    if (!description || String(description).trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: "Description must be at least 10 characters.",
      });
    }

    const ticket = await SupportModel.createTicket(supabaseAdmin, {
      userId: req.user.id,
      ticketNumber: generateTicketNumber(),
      category,
      subject: String(subject).trim(),
      description: String(description).trim(),
      relatedRideId: relatedRideId || null,
      relatedBookingId: relatedBookingId || null,
      priority: getPriority(category),
    });

    await SupportModel.addAttachments(
      supabaseAdmin,
      ticket.id,
      Array.isArray(attachments) ? attachments : [],
    );

    const fullTicket = await SupportModel.findByIdForUser(
      supabaseAdmin,
      ticket.id,
      req.user.id,
    );

    return res.status(201).json({
      success: true,
      message: "Support ticket created successfully.",
      data: {
        ticket: mapTicket(fullTicket),
      },
    });
  } catch (error) {
    console.error("[ERROR] Create support ticket:", {
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
      code: error?.code,
      stack: error?.stack,
    });

    return res.status(500).json({
      success: false,
      message: "Unable to create support ticket.",
    });
  }
};

const getMySupportTickets = async (req, res) => {
  try {
    const tickets = await SupportModel.findByUser(supabaseAdmin, req.user.id);

    return res.status(200).json({
      success: true,
      message: "Support tickets fetched successfully.",
      data: {
        tickets: tickets.map(mapTicket),
      },
    });
  } catch (error) {
    console.error("[ERROR] Get support tickets:", error?.message || error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch support tickets.",
    });
  }
};

const getSupportTicketById = async (req, res) => {
  try {
    const ticket = await SupportModel.findByIdForUser(
      supabaseAdmin,
      req.params.id,
      req.user.id,
    );

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Support ticket not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        ticket: mapTicket(ticket),
      },
    });
  } catch (error) {
    console.error("[ERROR] Get support ticket:", error?.message || error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch support ticket.",
    });
  }
};

module.exports = {
  getSupportCategories,
  createSupportTicket,
  getMySupportTickets,
  getSupportTicketById,
};