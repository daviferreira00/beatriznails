const pool = require("../db/connection");

// ✅ Corrige o erro "Unexpected non-whitespace character after JSON..."
function parseDiasSemana(raw) {
    if (raw == null) return [1, 2, 3, 4, 5, 6];

    // Às vezes o driver já retorna array/objeto
    if (Array.isArray(raw)) {
        const arr = raw.map(Number).filter(Number.isFinite);
        return arr.length ? arr : [1, 2, 3, 4, 5, 6];
    }

    const s = String(raw).trim();
    if (!s) return [1, 2, 3, 4, 5, 6];

    // JSON válido: "[1,2,3]"
    if (s.startsWith("[")) {
        try {
            const arr = JSON.parse(s);
            const out = Array.isArray(arr) ? arr.map(Number).filter(Number.isFinite) : [];
            return out.length ? out : [1, 2, 3, 4, 5, 6];
        } catch {
            // cai para os próximos formatos
        }
    }

    // CSV: "1,2,3,4,5,6"
    if (s.includes(",")) {
        const out = s.split(",").map(x => Number(String(x).trim())).filter(Number.isFinite);
        return out.length ? out : [1, 2, 3, 4, 5, 6];
    }

    // Número único: "1"
    const n = Number(s);
    if (Number.isFinite(n)) return [n];

    return [1, 2, 3, 4, 5, 6];
}

exports.get = async (req, res) => {
    try {
        const [[row]] = await pool.query(
            `SELECT hora_inicio, hora_fim, intervalo_minutos, dias_semana_json
             FROM config_agenda
             ORDER BY id DESC
                 LIMIT 1`
        );

        const dias = parseDiasSemana(row?.dias_semana_json);

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

        if (!hora_inicio || !hora_fim) {
            return res.status(400).json({ erro: "hora_inicio e hora_fim são obrigatórios" });
        }

        const intervalo = Number(intervalo_minutos);
        if (!Number.isFinite(intervalo) || intervalo < 5) {
            return res.status(400).json({ erro: "intervalo_minutos inválido" });
        }

        if (!Array.isArray(dias_semana) || dias_semana.length === 0) {
            return res.status(400).json({ erro: "dias_semana deve ser um array com pelo menos 1 dia" });
        }

        const diasNormalizados = dias_semana.map(Number).filter(Number.isFinite);
        if (diasNormalizados.length === 0) {
            return res.status(400).json({ erro: "dias_semana inválido" });
        }

        await pool.query(
            `UPDATE config_agenda
             SET hora_inicio = ?, hora_fim = ?, intervalo_minutos = ?, dias_semana_json = ?
                 ORDER BY id DESC LIMIT 1`,
            [hora_inicio, hora_fim, intervalo, JSON.stringify(diasNormalizados)]
        );

        res.json({ mensagem: "Agenda semanal atualizada com sucesso" });
    } catch (e) {
        res.status(500).json({ erro: "Erro ao salvar config de agenda", detalhe: e.message });
    }
};