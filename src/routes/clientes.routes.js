const express = require("express");
const router = express.Router();
const controller = require("../controllers/clientes.controller");
const { requireAuth } = require("../middlewares/auth.middleware");

// público (usado no agendar)
router.get("/telefone/:telefone", controller.buscarPorTelefone);

// a partir daqui, tudo exige login
router.use(requireAuth);

router.get("/", controller.listar);
router.post("/", controller.criar);
router.get("/:id", controller.buscarPorId);
router.put("/:id", controller.atualizar);
router.delete("/:id", controller.remover);

module.exports = router;