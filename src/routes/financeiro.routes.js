const express = require("express");
const router = express.Router();
const controller = require("../controllers/financeiro.controller");
const { requireAuth } = require("../middlewares/auth.middleware");

router.use(requireAuth);

router.get("/resumo", controller.resumo);

// despesas
router.get("/despesas", controller.listarDespesas);
router.post("/despesas", controller.criarDespesa);
router.delete("/despesas/:id", controller.removerDespesa);

// fechamento
router.get("/fechamento", controller.fechamentoDia);

// estoque (dentro do financeiro)
router.get("/estoque/itens", controller.estoqueListarItens);
router.post("/estoque/itens", controller.estoqueCriarItem); // ✅ ESSE AQUI
router.get("/estoque/alertas", controller.estoqueAlertas);
router.post("/estoque/entrada", controller.estoqueEntrada);

module.exports = router;