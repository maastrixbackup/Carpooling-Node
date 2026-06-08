const express = require("express");
const authMiddleware = require("../../middleware/auth.middleware");
const { getHomeBootstrap } = require("../../controllers/bootstrap/home.controller");

const router = express.Router();
router.use(authMiddleware);

router.get("/home", getHomeBootstrap);

module.exports = router;