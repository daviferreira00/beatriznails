const pool = require("../db/connection");

exports.listar = async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM servicos ORDER BY id DESC");
        res.json(rows);
    } catch (error) {
        res.status(500).json({
            erro: "Erro ao listar serviços",
            detalhe: error.message
        });
    }
};

exports.criar = async (req, res) => {
    try {
        const { nome, valor, duracao_minutos } = req.body;

        if (!nome || valor == null || !duracao_minutos) {
            return res.status(400).json({
                erro: "Nome, valor e duração são obrigatórios"
            });
        }

        const [result] = await pool.query(
            "INSERT INTO servicos (nome, valor, duracao_minutos) VALUES (?, ?, ?)",
            [nome, valor, duracao_minutos]
        );

        res.status(201).json({
            mensagem: "Serviço cadastrado com sucesso",
            id: result.insertId
        });
    } catch (error) {
        res.status(500).json({
            erro: "Erro ao cadastrar serviço",
            detalhe: error.message
        });
    }
};

exports.remover = async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await pool.query("SELECT id FROM servicos WHERE id = ?", [id]);

        if (rows.length === 0) {
            return res.status(404).json({
                erro: "Serviço não encontrado"
            });
        }

        await pool.query("DELETE FROM servicos WHERE id = ?", [id]);

        res.json({
            mensagem: "Serviço removido com sucesso"
        });
    } catch (error) {
        res.status(500).json({
            erro: "Erro ao remover serviço",
            detalhe: error.message
        });
    }
};