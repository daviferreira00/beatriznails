const bcrypt = require("bcryptjs");
const usuariosModel = require("../models/usuarios.model");
const db = require("../db/connection");

exports.listarUsuarios = async (req, res) => {
    try {
        const usuarios = await usuariosModel.listarTodos();
        return res.status(200).json(usuarios);
    } catch (error) {
        console.error("Erro ao listar usuários:", error);
        return res.status(500).json({ erro: "Erro interno do servidor ao buscar usuários" });
    }
};

exports.criarUsuario = async (req, res) => {
    try {
        const { nome, email, senha, perfil } = req.body;

        if (!nome || !email || !senha || !perfil) {
            return res.status(400).json({ erro: "Todos os campos são obrigatórios" });
        }

        const usuarioExistente = await usuariosModel.buscarPorEmail(email);
        if (usuarioExistente) {
            return res.status(400).json({ erro: "Este e-mail já está em uso" });
        }

        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(senha, salt);

        await usuariosModel.criar(nome, email, senhaHash, perfil);

        return res.status(201).json({ mensagem: "Usuário cadastrado com sucesso!" });
    } catch (error) {
        console.error("Erro ao criar usuário:", error);
        return res.status(500).json({ erro: "Erro interno ao cadastrar usuário" });
    }
};

exports.deletarUsuario = async (req, res) => {
    try {
        const { id } = req.params;

        if (req.user && parseInt(id) === req.user.id) {
            return res.status(403).json({ erro: "Você não pode excluir seu próprio usuário." });
        }

        const sucesso = await usuariosModel.deletar(id);

        if (!sucesso) {
            return res.status(404).json({ erro: "Usuário não encontrado." });
        }

        return res.status(200).json({ mensagem: "Usuário excluído com sucesso." });
    } catch (error) {
        console.error("Erro ao deletar usuário:", error);
        return res.status(500).json({ erro: "Erro interno ao excluir usuário" });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { nome, email } = req.body;
        const id = req.user.id;

        const [rows] = await db.query(
            "SELECT foto FROM usuarios WHERE id = ?",
            [id]
        );

        if (!rows.length) {
            return res.status(404).json({ erro: "Usuário não encontrado" });
        }

        let fotoUrl = rows[0].foto;

        if (req.file) {
            fotoUrl = `/assets/profiles/${req.file.filename}`;
        }

        await db.query(
            "UPDATE usuarios SET nome = ?, email = ?, foto = ? WHERE id = ?",
            [nome, email, fotoUrl, id]
        );

        const [userRows] = await db.query(
            "SELECT * FROM usuarios WHERE id = ?",
            [id]
        );

        if (!userRows.length) {
            return res.status(404).json({ erro: "Usuário não encontrado após atualização" });
        }

        const userData = { ...userRows[0] };
        delete userData.senha;

        return res.status(200).json({
            mensagem: "Perfil atualizado!",
            user_data: userData
        });
    } catch (error) {
        console.error("Erro ao atualizar perfil:", error);
        return res.status(500).json({ erro: "Erro ao atualizar perfil" });
    }
};

exports.changePassword = async (req, res) => {
    try {
        const { senhaAntiga, senhaNova } = req.body;
        const id = req.user.id;

        const [rows] = await db.query("SELECT senha FROM usuarios WHERE id = ?", [id]);
        const user = rows[0];

        const senhaValida = await bcrypt.compare(senhaAntiga, user.senha);
        if (!senhaValida) return res.status(401).json({ erro: "Senha atual incorreta" });

        const salt = await bcrypt.genSalt(10);
        const novaSenhaHash = await bcrypt.hash(senhaNova, salt);

        await db.query("UPDATE usuarios SET senha = ? WHERE id = ?", [novaSenhaHash, id]);
        res.status(200).json({ mensagem: "Senha alterada com sucesso!" });
    } catch (error) {
        res.status(500).json({ erro: "Erro ao trocar senha" });
        console.log(error);
    }
};