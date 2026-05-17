const express = require("express");
const router = express.Router();
const controller = require("../controllers/configAgenda.controller");
const { requireAuth } = require("../middlewares/auth.middleware");

router.use(requireAuth);

router.get("/", controller.get);
router.put("/", controller.update);

module.exports = router;