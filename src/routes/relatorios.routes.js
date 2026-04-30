const express = require("express");
const router = express.Router();
const controller = require("../controllers/relatorios.controller");
const { requireAuth } = require("../middlewares/auth.middleware");

router.use(requireAuth);

router.get("/top-servicos", controller.topServicosPago);
router.get("/top-clientes", controller.topClientesPago);

module.exports = router;