const pool = require("../db/connection");

function todayISO() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

exports.resumo = async (req, res) => {
    try {
        const hoje = todayISO();

        // Receita total: soma de agendamentos REALIZADO (ou pagos)
        // Aqui vou usar REALIZADO como base. Se preferir "pago = true", eu ajusto.
        const [[receitaTotalRow]] = await pool.query(
            `SELECT COALESCE(SUM(valor_cobrado), 0) AS total_receitas
       FROM agendamentos
       WHERE status = 'REALIZADO'`
        );

        const [[receitaMesRow]] = await pool.query(
            `SELECT COALESCE(SUM(valor_cobrado), 0) AS receitas_mes
       FROM agendamentos
       WHERE status = 'REALIZADO'
         AND YEAR(data_agendamento) = YEAR(CURDATE())
         AND MONTH(data_agendamento) = MONTH(CURDATE())`
        );

        const [[receitaHojeRow]] = await pool.query(
            `SELECT COALESCE(SUM(valor_cobrado), 0) AS receitas_hoje
       FROM agendamentos
       WHERE status = 'REALIZADO'
         AND data_agendamento = ?`,
            [hoje]
        );

        // Despesas
        const [[despesaTotalRow]] = await pool.query(
            `SELECT COALESCE(SUM(valor), 0) AS total_despesas
       FROM despesas`
        );

        const [[despesaMesRow]] = await pool.query(
            `SELECT COALESCE(SUM(valor), 0) AS despesas_mes
       FROM despesas
       WHERE YEAR(data_despesa) = YEAR(CURDATE())
         AND MONTH(data_despesa) = MONTH(CURDATE())`
        );

        const [[despesaHojeRow]] = await pool.query(
            `SELECT COALESCE(SUM(valor), 0) AS despesas_hoje
       FROM despesas
       WHERE data_despesa = ?`,
            [hoje]
        );

        // Gastos com materiais (futuro estoque)
        const [[materiaisMesRow]] = await pool.query(
            `SELECT COALESCE(SUM(valor), 0) AS materiais_mes
       FROM despesas
       WHERE YEAR(data_despesa) = YEAR(CURDATE())
         AND MONTH(data_despesa) = MONTH(CURDATE())
         AND (origem = 'ESTOQUE' OR categoria LIKE '%MATERIA%')`
        );

        const total_receitas = Number(receitaTotalRow.total_receitas || 0);
        const total_despesas = Number(despesaTotalRow.total_despesas || 0);
        const lucro_total = total_receitas - total_despesas;

        res.json({
            total_receitas,
            total_despesas,
            lucro_total,
            receitas_hoje: Number(receitaHojeRow.receitas_hoje || 0),
            despesas_hoje: Number(despesaHojeRow.despesas_hoje || 0),
            receitas_mes: Number(receitaMesRow.receitas_mes || 0),
            despesas_mes: Number(despesaMesRow.despesas_mes || 0),
            materiais_mes: Number(materiaisMesRow.materiais_mes || 0)
        });
    } catch (error) {
        res.status(500).json({
            erro: "Erro ao gerar resumo financeiro",
            detalhe: error.message
        });
    }
};

exports.listarDespesas = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT id, descricao, categoria, valor, valor_unitario, quantidade, data_despesa, origem
             FROM despesas
             ORDER BY data_despesa DESC, id DESC`
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({
            erro: "Erro ao listar despesas",
            detalhe: error.message
        });
    }
};

exports.criarDespesa = async (req, res) => {
    try {
        const { descricao, categoria, valor, valor_unitario, quantidade, data_despesa, origem } = req.body;

        if (!descricao || !data_despesa) {
            return res.status(400).json({
                erro: "Descrição e data da despesa são obrigatórios"
            });
        }

        const qtd = Number(quantidade || 1);
        if (!Number.isInteger(qtd) || qtd <= 0) {
            return res.status(400).json({ erro: "Quantidade inválida" });
        }

        const vUnit = valor_unitario != null && valor_unitario !== ""
            ? Number(valor_unitario)
            : null;

        // Se vier valor_unitario, calcula total. Senão usa "valor" como total.
        let total;
        if (vUnit != null && !Number.isNaN(vUnit)) {
            total = vUnit * qtd;
        } else {
            if (valor == null || valor === "") {
                return res.status(400).json({ erro: "Informe o valor unitário ou o valor total" });
            }
            total = Number(valor);
        }

        if (Number.isNaN(total) || total < 0) {
            return res.status(400).json({ erro: "Valor inválido" });
        }

        const origemFinal = origem === "ESTOQUE" ? "ESTOQUE" : "MANUAL";

        const [result] = await pool.query(
            `INSERT INTO despesas (descricao, categoria, valor, valor_unitario, quantidade, data_despesa, origem)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [descricao, categoria || null, total, vUnit, qtd, data_despesa, origemFinal]
        );

        res.status(201).json({
            mensagem: "Despesa cadastrada com sucesso",
            id: result.insertId
        });
    } catch (error) {
        res.status(500).json({
            erro: "Erro ao cadastrar despesa",
            detalhe: error.message
        });
    }
};

exports.removerDespesa = async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await pool.query("SELECT id FROM despesas WHERE id = ?", [id]);
        if (rows.length === 0) {
            return res.status(404).json({ erro: "Despesa não encontrada" });
        }

        await pool.query("DELETE FROM despesas WHERE id = ?", [id]);

        res.json({ mensagem: "Despesa removida com sucesso" });
    } catch (error) {
        res.status(500).json({
            erro: "Erro ao remover despesa",
            detalhe: error.message
        });
    }
};