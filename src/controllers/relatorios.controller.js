const pool = require("../db/connection");

function validarPeriodo(req, res) {
    const { de, ate } = req.query;
    if (!de || !ate) {
        res.status(400).json({ erro: "Informe 'de' e 'ate' no formato YYYY-MM-DD" });
        return null;
    }
    return { de, ate };
}

// TOP SERVIÇOS (pago = 1)
exports.topServicosPago = async (req, res) => {
    try {
        const periodo = validarPeriodo(req, res);
        if (!periodo) return;
        const { de, ate } = periodo;

        const [rows] = await pool.query(
            `SELECT s.id, s.nome,
              COUNT(*) AS total_realizados,
              COALESCE(SUM(a.valor_cobrado),0) AS total_faturado
       FROM agendamentos a
       JOIN servicos s ON s.id = a.servico_id
       WHERE a.data_agendamento BETWEEN ? AND ?
         AND a.pago = 1
       GROUP BY s.id
       ORDER BY total_realizados DESC
       LIMIT 20`,
            [de, ate]
        );

        res.json(rows);
    } catch (e) {
        res.status(500).json({ erro: "Erro ao gerar top serviços", detalhe: e.message });
    }
};

// TOP CLIENTES (pago = 1)
exports.topClientesPago = async (req, res) => {
    try {
        const periodo = validarPeriodo(req, res);
        if (!periodo) return;
        const { de, ate } = periodo;

        const [rows] = await pool.query(
            `SELECT c.id, c.nome, c.telefone,
              COUNT(*) AS total_agendamentos,
              COALESCE(SUM(a.valor_cobrado),0) AS total_gasto
       FROM agendamentos a
       JOIN clientes c ON c.id = a.cliente_id
       WHERE a.data_agendamento BETWEEN ? AND ?
         AND a.pago = 1
       GROUP BY c.id
       ORDER BY total_agendamentos DESC
       LIMIT 20`,
            [de, ate]
        );

        res.json(rows);
    } catch (e) {
        res.status(500).json({ erro: "Erro ao gerar top clientes", detalhe: e.message });
    }
};
exports.aniversariantes = async (req, res) => {
    try {
        const { dia, mes } = req.query;

        if (!dia || !mes) {
            return res.status(400).json({ erro: "Informe dia e mes (ex: ?dia=7&mes=11)" });
        }

        const [rows] = await pool.query(
            `SELECT id, nome, telefone, data_nascimento
       FROM clientes
       WHERE data_nascimento IS NOT NULL
         AND DAY(data_nascimento) = ?
         AND MONTH(data_nascimento) = ?
       ORDER BY nome ASC`,
            [Number(dia), Number(mes)]
        );

        res.json(rows);
    } catch (e) {
        res.status(500).json({ erro: "Erro ao listar aniversariantes", detalhe: e.message });
    }
};