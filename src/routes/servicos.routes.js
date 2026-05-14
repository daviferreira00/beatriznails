const express = require("express");
const router = express.Router();
const controller = require("../controllers/servicos.controller");
const { requireAuth } = require("../middlewares/auth.middleware");

/**
 * =========================
 * ROTAS PÚBLICAS (AGENDAR)
 * =========================
 * Use estas no agendar.html (cliente)
 */
router.get("/ativos", controller.listarAtivos); // ✅ só ativos para cliente
// Se você ainda precisa manter compatibilidade, pode deixar o "/" público também:
// router.get("/", controller.listarAtivos);

/**
 * =========================
 * ROTAS ADMIN (PAINEL)
 * =========================
 */
router.use(requireAuth);

// lista todos (ativos + inativos) para o painel
router.get("/", controller.listar);

// CRUD + status
router.post("/", controller.criar);
router.put("/:id", controller.atualizar);
router.patch("/:id/status", controller.alterarStatus);

// se quiser manter remover, ok (mas recomendo usar inativar)
router.delete("/:id", controller.remover);

module.exports = router;