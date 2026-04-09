const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const usuariosModel = require("../models/usuarios.model");

exports.login = async (req, res) => {
    console.log("🟣 POST /api/auth/login (DB) - Iniciando autenticação...");
    try {
        const { email, senha } = req.body;

        if (!email || !senha) {
            return res.status(400).json({ erro: "E-mail e senha são obrigatórios" });
        }

        // 1. Busca o usuário no banco
        const usuario = await usuariosModel.buscarPorEmail(email);

        if (!usuario) {
            console.log("❌ Usuário não encontrado no banco:", email);
            return res.status(401).json({ erro: "E-mail ou senha inválidos" });
        }

        // 2. Compara a senha digitada com o hash salvo no banco
        const senhaValida = await bcrypt.compare(senha, usuario.senha);

        if (!senhaValida) {
            console.log("❌ Senha incorreta para o email:", email);
            return res.status(401).json({ erro: "E-mail ou senha inválidos" });
        }

        // 3. Gera o Token se tudo estiver certo
        if (!process.env.JWT_SECRET) {
            return res.status(500).json({ erro: "JWT_SECRET não configurado no servidor" });
        }

        const token = jwt.sign(
            { id: usuario.id, email: usuario.email, role: usuario.perfil },
            process.env.JWT_SECRET,
            { expiresIn: "12h" }
        );

        console.log("✅ Login aprovado para:", usuario.email);

        return res.status(200).json({
            message: "Login realizado com sucesso",
            token,
            user_data: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email,
                perfil: usuario.perfil,
                foto: usuario.foto || "/assets/default-avatar.png"
            }
        });

    } catch (err) {
        console.error("🔥 ERRO no auth.controller:", err);
        return res.status(500).json({ erro: "Erro interno do servidor" });
    }
};