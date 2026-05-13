const pool = require("../db/connection");

function todayISO() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function validarDataISO(data) {
    if (!data) return null;
    const s = String(data).slice(0, 10);
    // valida superficial YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    return s;
}

/**
 * =========================
 * RESUMO FINANCEIRO
 * =========================
 * Agora usa pago=1 para receitas (mais correto que status).
 */
exports.resumo = async (req, res) => {
    try {
        const hoje = todayISO();

        // Receita total: soma de agendamentos pagos
        const [[receitaTotalRow]] = await pool.query(
            `SELECT COALESCE(SUM(valor_cobrado), 0) AS total_receitas
             FROM agendamentos
             WHERE pago = 1`
        );

        const [[receitaMesRow]] = await pool.query(
            `SELECT COALESCE(SUM(valor_cobrado), 0) AS receitas_mes
             FROM agendamentos
             WHERE pago = 1
                 AND YEAR(data_agendamento) = YEAR(CURDATE())
               AND MONTH(data_agendamento) = MONTH(CURDATE())`
        );

        const [[receitaHojeRow]] = await pool.query(
            `SELECT COALESCE(SUM(valor_cobrado), 0) AS receitas_hoje
             FROM agendamentos
             WHERE pago = 1
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

        // Materiais do mês: apenas origem ESTOQUE (gasto vindo do estoque)
        const [[materiaisMesRow]] = await pool.query(
            `SELECT COALESCE(SUM(valor), 0) AS materiais_mes
             FROM despesas
             WHERE origem = 'ESTOQUE'
                 AND YEAR(data_despesa) = YEAR(CURDATE())
               AND MONTH(data_despesa) = MONTH(CURDATE())`
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

/**
 * =========================
 * FECHAMENTO DO DIA
 * =========================
 * GET /api/financeiro/fechamento?data=YYYY-MM-DD
 *
 * - receitas por forma (PIX/DEBITO/CREDITO/DINHEIRO) usando pago=1
 * - despesas do dia (tabela despesas)
 *
 * OBS: se você tiver pago_em, use ele. Se não tiver, a query tenta usar data+hora do agendamento.
 */
exports.fechamentoDia = async (req, res) => {
    try {
        const data = validarDataISO(req.query.data) || todayISO();

        const [receitasRows] = await pool.query(
            `SELECT forma_pagamento,
              COUNT(*) AS qtd,
              COALESCE(SUM(valor_cobrado),0) AS total
       FROM agendamentos
       WHERE pago = 1
         AND DATE(COALESCE(pago_em, CONCAT(data_agendamento,' ',hora_agendamento))) = ?
       GROUP BY forma_pagamento`,
            [data]
        );

        const [[despRow]] = await pool.query(
            `SELECT COALESCE(SUM(valor),0) AS total_despesas
       FROM despesas
       WHERE data_despesa = ?`,
            [data]
        );

        const formas = ["PIX", "DEBITO", "CREDITO", "DINHEIRO"];
        const receitas = Object.fromEntries(formas.map(f => [f, 0]));
        const qtd_pagamentos = Object.fromEntries(formas.map(f => [f, 0]));

        receitasRows.forEach(r => {
            const f = String(r.forma_pagamento || "").toUpperCase();
            if (receitas[f] !== undefined) {
                receitas[f] = Number(r.total || 0);
                qtd_pagamentos[f] = Number(r.qtd || 0);
            }
        });

        const total_receitas = formas.reduce((acc, f) => acc + receitas[f], 0);
        const total_despesas = Number(despRow?.total_despesas || 0);

        res.json({
            data,
            receitas,
            qtd_pagamentos,
            total_receitas,
            total_despesas,
            saldo_do_dia: total_receitas - total_despesas
        });
    } catch (error) {
        res.status(500).json({
            erro: "Erro ao gerar fechamento do dia",
            detalhe: error.message
        });
    }
};

/**
 * =========================
 * DESPESAS (mantém seu padrão atual)
 * =========================
 */
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

/**
 * =========================
 * ESTOQUE (dentro do Financeiro)
 * =========================
 * Tabelas: estoque_itens / estoque_movimentos
 */

// GET /api/financeiro/estoque/itens
exports.estoqueListarItens = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT id, nome, unidade, quantidade_atual, estoque_minimo, custo_medio, ativo
       FROM estoque_itens
       ORDER BY nome ASC`
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ erro: "Erro ao listar itens do estoque", detalhe: error.message });
    }
};

// GET /api/financeiro/estoque/alertas
exports.estoqueAlertas = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT id, nome, unidade, quantidade_atual, estoque_minimo
       FROM estoque_itens
       WHERE ativo = 1 AND quantidade_atual <= estoque_minimo
       ORDER BY (quantidade_atual - estoque_minimo) ASC`
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ erro: "Erro ao buscar alertas do estoque", detalhe: error.message });
    }
};

// POST /api/financeiro/estoque/entrada
// body: { item_id, quantidade, custo_unitario, data_despesa, observacao }
exports.estoqueEntrada = async (req, res) => {
    const conn = await pool.getConnection();
    try {
        const { item_id, quantidade, custo_unitario, data_despesa, observacao } = req.body;

        const idItem = Number(item_id);
        const qtd = Number(quantidade);
        const vUnit = Number(custo_unitario);
        const data = validarDataISO(data_despesa);

        if (!idItem || !Number.isFinite(idItem)) return res.status(400).json({ erro: "item_id inválido" });
        if (!Number.isFinite(qtd) || qtd <= 0) return res.status(400).json({ erro: "quantidade inválida" });
        if (!Number.isFinite(vUnit) || vUnit < 0) return res.status(400).json({ erro: "custo_unitario inválido" });
        if (!data) return res.status(400).json({ erro: "data_despesa inválida (YYYY-MM-DD)" });

        const total = qtd * vUnit;

        await conn.beginTransaction();

        const [[item]] = await conn.query(
            `SELECT id, nome, quantidade_atual, custo_medio
       FROM estoque_itens
       WHERE id = ? AND ativo = 1`,
            [idItem]
        );

        if (!item) {
            await conn.rollback();
            return res.status(404).json({ erro: "Item de estoque não encontrado" });
        }

        // Atualiza quantidade e custo médio (média ponderada)
        const qAtual = Number(item.quantidade_atual || 0);
        const custoAtual = item.custo_medio != null ? Number(item.custo_medio) : null;
        const novoQ = qAtual + qtd;

        let novoCustoMedio = custoAtual;
        if (novoQ > 0) {
            const custoTotalAnterior = (custoAtual != null ? custoAtual : 0) * qAtual;
            const custoTotalNovo = custoTotalAnterior + (vUnit * qtd);
            novoCustoMedio = custoTotalNovo / novoQ;
        }

        await conn.query(
            `UPDATE estoque_itens
       SET quantidade_atual = ?, custo_medio = ?
       WHERE id = ?`,
            [novoQ, novoCustoMedio, idItem]
        );

        // Cria despesa automática no financeiro
        const descricaoDespesa = `Compra estoque: ${item.nome}`;
        const categoria = "MATERIAIS";
        const origem = "ESTOQUE";

        const [despIns] = await conn.query(
            `INSERT INTO despesas (descricao, categoria, valor, valor_unitario, quantidade, data_despesa, origem)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [descricaoDespesa, categoria, total, vUnit, qtd, data, origem]
        );

        const despesaId = despIns.insertId;

        // Registra movimento de estoque vinculado à despesa
        const [movIns] = await conn.query(
            `INSERT INTO estoque_movimentos (item_id, tipo, quantidade, custo_unitario, total, observacao, despesa_id)
       VALUES (?, 'ENTRADA', ?, ?, ?, ?, ?)`,
            [idItem, qtd, vUnit, total, observacao || null, despesaId]
        );

        await conn.commit();

        res.status(201).json({
            mensagem: "Entrada registrada e despesa criada no financeiro",
            movimento_id: movIns.insertId,
            despesa_id: despesaId
        });
    } catch (error) {
        try { await conn.rollback(); } catch {}
        res.status(500).json({ erro: "Erro ao registrar entrada no estoque", detalhe: error.message });
    } finally {
        conn.release();
    }
};