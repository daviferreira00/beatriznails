const express = require("express");
const router = express.Router();
const controller = require("../controllers/agendamentos.controller");
const { requireAuth } = require("../middlewares/auth.middleware");

// público (cliente)
router.get("/disponiveis", controller.listarHorariosDisponiveis);
router.post("/publico", controller.criarAgendamentoPublico);

// admin
router.use(requireAuth);

router.get("/", controller.listar);
router.patch("/:id/status", controller.atualizarStatus);
router.patch("/:id/pagamento", controller.registrarPagamento);
// se tiver outros endpoints admin, coloca aqui
router.post("/", controller.criarAdmin);
router.patch("/:id/pagamento", controller.registrarPagamento);

module.exports = router;