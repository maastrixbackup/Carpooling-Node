const express = require("express");
const authMiddleware = require("../middleware/auth.middleware");

const {
  getSupportCategories,
  createSupportTicket,
  getMySupportTickets,
  getSupportTicketById,
} = require("../controllers/support/support.controller");

const router = express.Router();

router.use(authMiddleware);

router.get("/categories", getSupportCategories);
router.post("/tickets", createSupportTicket);
router.get("/tickets", getMySupportTickets);
router.get("/tickets/:id", getSupportTicketById);

module.exports = router;