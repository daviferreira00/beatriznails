const express = require("express");
const router = express.Router();
const controller = require("../controllers/financeiro.controller");
const { requireAuth } = require("../middlewares/auth.middleware");

router.use(requireAuth);

// Resumo / Dashboard financeiro
router.get("/resumo", controller.resumo);

// Despesas
router.get("/despesas", controller.listarDespesas);
router.post("/despesas", controller.criarDespesa);
router.delete("/despesas/:id", controller.removerDespesa);

// Fechamento do caixa (por forma de pagamento + despesas do dia)
router.get("/fechamento", controller.fechamentoDia);

// Estoque (dentro do financeiro)
router.get("/estoque/itens", controller.estoqueListarItens);
router.get("/estoque/alertas", controller.estoqueAlertas);
router.post("/estoque/entrada", controller.estoqueEntrada);

module.exports = router;