const express = require("express");
const router = express.Router();
const usuariosController = require("../controllers/usuarios.controller");
const { requireAuth } = require("../middlewares/auth.middleware");
const upload = require("../middlewares/upload.middleware");

router.use(requireAuth);

router.get("/", usuariosController.listarUsuarios);
router.post("/", usuariosController.criarUsuario);
router.delete("/:id", usuariosController.deletarUsuario);
router.put("/profile", upload.single("foto"), usuariosController.updateProfile);
router.put("/change-password", usuariosController.changePassword);

module.exports = router;