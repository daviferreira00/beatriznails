const express = require("express");
const router = express.Router();
const controller = require("../controllers/servicos.controller");
const { requireAuth } = require("../middlewares/auth.middleware");

// público (agendar usa)
router.get("/", controller.listar);

// admin
router.use(requireAuth);

router.post("/", controller.criar);
router.delete("/:id", controller.remover);

module.exports = router;