const express = require("express");
const router = express.Router();
const controller = require("../controllers/financeiro.controller");
const { requireAuth } = require("../middlewares/auth.middleware");

router.use(requireAuth);

router.get("/resumo", controller.resumo);
router.get("/despesas", controller.listarDespesas);
router.post("/despesas", controller.criarDespesa);
router.delete("/despesas/:id", controller.removerDespesa);

module.exports = router;