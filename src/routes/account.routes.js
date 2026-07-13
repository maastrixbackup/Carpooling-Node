const express = require("express");
const authMiddleware = require("../middleware/auth.middleware");

const {
  getDeletionRequestStatus,
  requestAccountDeletion,
  cancelAccountDeletion,
} = require("../controllers/account/account.controller");

const router = express.Router();

router.use(authMiddleware);

router.get("/delete-request", getDeletionRequestStatus);
router.post("/delete-request", requestAccountDeletion);
router.post("/delete-request/cancel", cancelAccountDeletion);

module.exports = router;