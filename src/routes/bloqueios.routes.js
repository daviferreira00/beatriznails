const express = require("express");
const router = express.Router();
const controller = require("../controllers/bloqueios.controller");
const { requireAuth } = require("../middlewares/auth.middleware");

router.use(requireAuth);

router.get("/", controller.listar);
router.post("/", controller.criar);
router.delete("/:id", controller.remover);

module.exports = router;