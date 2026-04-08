const pool = require("../db/connection");

exports.listar = async (req, res) => {
    try {
        const { data } = req.query;

        let sql = `
      SELECT id, data_bloqueio, hora_inicio, hora_fim, motivo
      FROM bloqueios_agenda
    `;
        const params = [];

        if (data) {
            sql += ` WHERE data_bloqueio = ?`;
            params.push(data);
        }

        sql += ` ORDER BY data_bloqueio DESC, hora_inicio DESC`;

        const [rows] = await pool.query(sql, params);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ erro: "Erro ao listar bloqueios", detalhe: error.message });
    }
};

exports.criar = async (req, res) => {
    try {
        const { data_bloqueio, hora_inicio, hora_fim, motivo } = req.body;

        if (!data_bloqueio || !hora_inicio || !hora_fim) {
            return res.status(400).json({ erro: "Data, hora início e hora fim são obrigatórios" });
        }

        if (hora_fim <= hora_inicio) {
            return res.status(400).json({ erro: "Hora fim deve ser maior que hora início" });
        }

        // impede bloqueios sobrepostos (simples)
        const [conf] = await pool.query(
            `SELECT id FROM bloqueios_agenda
       WHERE data_bloqueio = ?
         AND NOT (hora_fim <= ? OR hora_inicio >= ?)
       LIMIT 1`,
            [data_bloqueio, hora_inicio, hora_fim]
        );

        if (conf.length > 0) {
            return res.status(400).json({ erro: "Já existe um bloqueio que conflita com esse horário" });
        }

        const [result] = await pool.query(
            `INSERT INTO bloqueios_agenda (data_bloqueio, hora_inicio, hora_fim, motivo)
       VALUES (?, ?, ?, ?)`,
            [data_bloqueio, hora_inicio, hora_fim, motivo || null]
        );

        res.status(201).json({ mensagem: "Bloqueio criado com sucesso", id: result.insertId });
    } catch (error) {
        res.status(500).json({ erro: "Erro ao criar bloqueio", detalhe: error.message });
    }
};

exports.remover = async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await pool.query("SELECT id FROM bloqueios_agenda WHERE id = ?", [id]);
        if (rows.length === 0) return res.status(404).json({ erro: "Bloqueio não encontrado" });

        await pool.query("DELETE FROM bloqueios_agenda WHERE id = ?", [id]);
        res.json({ mensagem: "Bloqueio removido com sucesso" });
    } catch (error) {
        res.status(500).json({ erro: "Erro ao remover bloqueio", detalhe: error.message });
    }
};