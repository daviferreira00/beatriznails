const pool = require("../db/connection");

function limparTelefone(telefone) {
    return String(telefone || "").replace(/\D/g, "");
}

exports.listar = async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM clientes ORDER BY id DESC");
        res.json(rows);
    } catch (error) {
        res.status(500).json({
            erro: "Erro ao listar clientes",
            detalhe: error.message
        });
    }
};

exports.buscarPorTelefone = async (req, res) => {
    try {
        const telefone = limparTelefone(req.params.telefone);

        const [rows] = await pool.query(
            "SELECT id, nome, telefone, email, data_nascimento FROM clientes WHERE telefone = ? LIMIT 1",
            [telefone]
        );

        if (rows.length === 0) {
            return res.status(404).json({ erro: "Esse número não possui cadastro" });
        }

        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({
            erro: "Erro ao buscar cliente por telefone",
            detalhe: error.message
        });
    }
};

exports.criar = async (req, res) => {
    try {
        const { nome, telefone, email, observacoes, data_nascimento } = req.body;
        const telefoneLimpo = limparTelefone(telefone);

        if (!nome || !telefoneLimpo) {
            return res.status(400).json({ erro: "Nome e telefone são obrigatórios" });
        }

        const [result] = await pool.query(
            "INSERT INTO clientes (nome, telefone, email, observacoes, data_nascimento) VALUES (?, ?, ?, ?, ?)",
            [nome, telefoneLimpo, email || null, observacoes || null, data_nascimento || null]
        );

        res.status(201).json({
            mensagem: "Cliente cadastrada com sucesso",
            id: result.insertId
        });
    } catch (error) {
        res.status(500).json({
            erro: "Erro ao cadastrar cliente",
            detalhe: error.message
        });
    }
};

exports.buscarPorId = async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await pool.query("SELECT * FROM clientes WHERE id = ?", [id]);

        if (rows.length === 0) {
            return res.status(404).json({ erro: "Cliente não encontrada" });
        }

        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({
            erro: "Erro ao buscar cliente",
            detalhe: error.message
        });
    }
};

exports.atualizar = async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, telefone, email, observacoes, data_nascimento } = req.body;
        const telefoneLimpo = limparTelefone(telefone);

        await pool.query(
            "UPDATE clientes SET nome = ?, telefone = ?, email = ?, observacoes = ?, data_nascimento = ? WHERE id = ?",
            [nome, telefoneLimpo, email || null, observacoes || null, data_nascimento || null, id]
        );

        res.json({ mensagem: "Cliente atualizada com sucesso" });
    } catch (error) {
        res.status(500).json({
            erro: "Erro ao atualizar cliente",
            detalhe: error.message
        });
    }
};

exports.remover = async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await pool.query("SELECT id FROM clientes WHERE id = ?", [id]);

        if (rows.length === 0) {
            return res.status(404).json({ erro: "Cliente não encontrada" });
        }

        await pool.query("DELETE FROM clientes WHERE id = ?", [id]);

        res.json({ mensagem: "Cliente removida com sucesso" });
    } catch (error) {
        res.status(500).json({
            erro: "Erro ao remover cliente",
            detalhe: error.message
        });
    }
};