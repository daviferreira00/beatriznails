const pool = require("../db/connection");

exports.get = async (req, res) => {
    try {
        const [[row]] = await pool.query(
            `SELECT hora_inicio, hora_fim, intervalo_minutos, dias_semana_json
       FROM config_agenda
       ORDER BY id DESC LIMIT 1`
        );

        const dias = row?.dias_semana_json ? JSON.parse(row.dias_semana_json) : [1,2,3,4,5,6];

        res.json({
            hora_inicio: row?.hora_inicio || "08:00:00",
            hora_fim: row?.hora_fim || "17:00:00",
            intervalo_minutos: row?.intervalo_minutos || 60,
            dias_semana: dias
        });
    } catch (e) {
        res.status(500).json({ erro: "Erro ao carregar config de agenda", detalhe: e.message });
    }
};

exports.update = async (req, res) => {
    try {
        const { hora_inicio, hora_fim, intervalo_minutos, dias_semana } = req.body;

        if (!hora_inicio || !hora_fim) return res.status(400).json({ erro: "hora_inicio e hora_fim são obrigatórios" });
        const intervalo = Number(intervalo_minutos);
        if (!Number.isFinite(intervalo) || intervalo < 5) return res.status(400).json({ erro: "intervalo_minutos inválido" });

        if (!Array.isArray(dias_semana) || dias_semana.length === 0) {
            return res.status(400).json({ erro: "dias_semana deve ser um array com pelo menos 1 dia" });
        }

        await pool.query(
            `UPDATE config_agenda
       SET hora_inicio = ?, hora_fim = ?, intervalo_minutos = ?, dias_semana_json = ?
       ORDER BY id DESC LIMIT 1`,
            [hora_inicio, hora_fim, intervalo, JSON.stringify(dias_semana)]
        );

        res.json({ mensagem: "Agenda semanal atualizada com sucesso" });
    } catch (e) {
        res.status(500).json({ erro: "Erro ao salvar config de agenda", detalhe: e.message });
    }
};