const pool = require("../db/connection");

function toNumber(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

exports.listar = async (req, res) => {
    try {
        // ADMIN: lista tudo (ativos + inativos)
        const [rows] = await pool.query(
            `SELECT id, nome, valor, duracao_minutos, ativo
       FROM servicos
       ORDER BY id DESC`
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({
            erro: "Erro ao listar serviços",
            detalhe: error.message
        });
    }
};

exports.listarAtivos = async (req, res) => {
    try {
        // PÚBLICO: lista só ativos (para agendar.html)
        const [rows] = await pool.query(
            `SELECT id, nome, valor, duracao_minutos, ativo
       FROM servicos
       WHERE ativo = 1
       ORDER BY id DESC`
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({
            erro: "Erro ao listar serviços ativos",
            detalhe: error.message
        });
    }
};

exports.criar = async (req, res) => {
    try {
        const { nome, valor, duracao_minutos } = req.body;

        if (!nome || !String(nome).trim()) {
            return res.status(400).json({ erro: "Nome do serviço é obrigatório" });
        }

        const v = toNumber(valor);
        const d = toNumber(duracao_minutos);

        if (v == null || v < 0) {
            return res.status(400).json({ erro: "Valor inválido" });
        }
        if (d == null || d <= 0) {
            return res.status(400).json({ erro: "Duração inválida" });
        }

        const [result] = await pool.query(
            `INSERT INTO servicos (nome, valor, duracao_minutos, ativo)
       VALUES (?, ?, ?, 1)`,
            [String(nome).trim(), v, d]
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

exports.atualizar = async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, valor, duracao_minutos } = req.body;

        if (!id) return res.status(400).json({ erro: "ID inválido" });
        if (!nome || !String(nome).trim()) {
            return res.status(400).json({ erro: "Nome do serviço é obrigatório" });
        }

        const v = toNumber(valor);
        const d = toNumber(duracao_minutos);

        if (v == null || v < 0) {
            return res.status(400).json({ erro: "Valor inválido" });
        }
        if (d == null || d <= 0) {
            return res.status(400).json({ erro: "Duração inválida" });
        }

        const [exists] = await pool.query(`SELECT id FROM servicos WHERE id = ?`, [id]);
        if (exists.length === 0) {
            return res.status(404).json({ erro: "Serviço não encontrado" });
        }

        await pool.query(
            `UPDATE servicos
       SET nome = ?, valor = ?, duracao_minutos = ?
       WHERE id = ?`,
            [String(nome).trim(), v, d, id]
        );

        res.json({ mensagem: "Serviço atualizado com sucesso" });
    } catch (error) {
        res.status(500).json({
            erro: "Erro ao atualizar serviço",
            detalhe: error.message
        });
    }
};

exports.alterarStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { ativo } = req.body;

        if (typeof ativo !== "boolean") {
            return res.status(400).json({ erro: "Campo 'ativo' deve ser true/false" });
        }

        const [exists] = await pool.query(`SELECT id FROM servicos WHERE id = ?`, [id]);
        if (exists.length === 0) {
            return res.status(404).json({ erro: "Serviço não encontrado" });
        }

        await pool.query(`UPDATE servicos SET ativo = ? WHERE id = ?`, [ativo ? 1 : 0, id]);

        res.json({ mensagem: ativo ? "Serviço ativado com sucesso" : "Serviço inativado com sucesso" });
    } catch (error) {
        res.status(500).json({
            erro: "Erro ao alterar status do serviço",
            detalhe: error.message
        });
    }
};

exports.remover = async (req, res) => {
    try {
        const { id } = req.params;

        const [exists] = await pool.query(`SELECT id FROM servicos WHERE id = ?`, [id]);
        if (exists.length === 0) {
            return res.status(404).json({ erro: "Serviço não encontrado" });
        }

        await pool.query(`DELETE FROM servicos WHERE id = ?`, [id]);
        res.json({ mensagem: "Serviço removido com sucesso" });
    } catch (error) {
        res.status(500).json({
            erro: "Erro ao remover serviço",
            detalhe: error.message
        });
    }
};