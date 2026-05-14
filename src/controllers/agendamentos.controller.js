const pool = require("../db/connection");

const HORARIOS_PADRAO = [
    "08:00:00",
    "09:00:00",
    "10:00:00",
    "11:00:00",
    "13:00:00",
    "14:00:00",
    "15:00:00",
    "16:00:00",
    "17:00:00"
];

function limparTelefone(telefone) {
    return String(telefone || "").replace(/\D/g, "");
}

function toNumber(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

exports.listar = async (req, res) => {
    try {
        const [rows] = await pool.query(`
      SELECT
        a.id,
        a.data_agendamento,
        a.hora_agendamento,
        a.status,
        a.observacoes,
        a.pago,
        a.forma_pagamento,
        a.valor_cobrado,
        a.desconto_tipo,
        a.desconto_valor,
        a.valor_final,
        a.pago_em,
        a.servico_id,
        a.servico_id_2,
        c.id AS cliente_id,
        c.nome AS cliente,
        c.telefone,
        s.id AS servico_id_1,
        s.nome AS servico,
        s.valor AS valor_servico,
        s.duracao_minutos
      FROM agendamentos a
      INNER JOIN clientes c ON c.id = a.cliente_id
      INNER JOIN servicos s ON s.id = a.servico_id
      ORDER BY a.data_agendamento DESC, a.hora_agendamento DESC
    `);

        res.json(rows);
    } catch (error) {
        res.status(500).json({ erro: "Erro ao listar agendamentos", detalhe: error.message });
    }
};

// (opcional/admin antigo)
exports.criar = async (req, res) => {
    try {
        const { cliente_id, servico_id, data_agendamento, hora_agendamento, observacoes } = req.body;

        if (!cliente_id || !servico_id || !data_agendamento || !hora_agendamento) {
            return res.status(400).json({
                erro: "cliente_id, servico_id, data_agendamento e hora_agendamento são obrigatórios"
            });
        }

        const [clienteRows] = await pool.query("SELECT id FROM clientes WHERE id = ?", [cliente_id]);
        if (clienteRows.length === 0) return res.status(404).json({ erro: "Cliente não encontrado" });

        const [[serv1]] = await pool.query("SELECT id, valor FROM servicos WHERE id = ?", [servico_id]);
        if (!serv1) return res.status(404).json({ erro: "Serviço não encontrado" });

        const [conflito] = await pool.query(
            `SELECT id
       FROM agendamentos
       WHERE data_agendamento = ?
         AND hora_agendamento = ?
         AND status IN ('AGENDADO', 'CONFIRMADO')`,
            [data_agendamento, hora_agendamento]
        );
        if (conflito.length > 0) return res.status(400).json({ erro: "Já existe um agendamento para esse horário" });

        const valorServico = Number(serv1.valor || 0);

        const [result] = await pool.query(
            `INSERT INTO agendamentos
       (cliente_id, servico_id, data_agendamento, hora_agendamento, observacoes, valor_cobrado, status, pago, forma_pagamento)
       VALUES (?, ?, ?, ?, ?, ?, 'AGENDADO', 0, 'PENDENTE')`,
            [cliente_id, servico_id, data_agendamento, hora_agendamento, observacoes || null, valorServico]
        );

        res.status(201).json({ mensagem: "Agendamento criado com sucesso", id: result.insertId });
    } catch (error) {
        res.status(500).json({ erro: "Erro ao criar agendamento", detalhe: error.message });
    }
};

exports.atualizarStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const statusValidos = ["AGENDADO", "CONFIRMADO", "REALIZADO", "CANCELADO"];
        if (!status || !statusValidos.includes(status)) {
            return res.status(400).json({ erro: "Status inválido" });
        }

        const [rows] = await pool.query("SELECT id FROM agendamentos WHERE id = ?", [id]);
        if (rows.length === 0) return res.status(404).json({ erro: "Agendamento não encontrado" });

        await pool.query("UPDATE agendamentos SET status = ? WHERE id = ?", [status, id]);
        res.json({ mensagem: "Status atualizado com sucesso" });
    } catch (error) {
        res.status(500).json({ erro: "Erro ao atualizar status", detalhe: error.message });
    }
};

/**
 * PATCH /api/agendamentos/:id/pagamento
 * body: { pago:boolean, forma_pagamento:string, desconto_tipo?:'VALOR'|'PERCENT'|null, desconto_valor?:number|null }
 *
 * Base do cálculo: valor_cobrado (oficial do agendamento)
 * Salva: desconto_tipo, desconto_valor, valor_final, pago_em
 */
exports.registrarPagamento = async (req, res) => {
    try {
        const { id } = req.params;
        const { pago, forma_pagamento, desconto_tipo, desconto_valor } = req.body;

        const formasValidas = ["PENDENTE", "DINHEIRO", "PIX", "DEBITO", "CREDITO"];
        const forma = String(forma_pagamento || "").toUpperCase();

        if (typeof pago !== "boolean") {
            return res.status(400).json({ erro: "Campo 'pago' deve ser true/false" });
        }
        if (!forma || !formasValidas.includes(forma)) {
            return res.status(400).json({ erro: "Forma de pagamento inválida" });
        }

        const [[ag]] = await pool.query(
            "SELECT id, valor_cobrado FROM agendamentos WHERE id = ?",
            [id]
        );
        if (!ag) return res.status(404).json({ erro: "Agendamento não encontrado" });

        const base = Number(ag.valor_cobrado || 0);

        // desconto (opcional)
        const tipo = desconto_tipo ? String(desconto_tipo).toUpperCase() : null;
        const tiposValidos = [null, "VALOR", "PERCENT"];
        if (!tiposValidos.includes(tipo)) {
            return res.status(400).json({ erro: "desconto_tipo inválido" });
        }

        const descNum = (desconto_valor === "" || desconto_valor == null) ? null : toNumber(desconto_valor);
        if (descNum != null && (descNum < 0)) {
            return res.status(400).json({ erro: "desconto_valor inválido" });
        }

        let valorFinal = base;
        if (pago && tipo && descNum != null) {
            if (tipo === "VALOR") {
                valorFinal = base - descNum;
            } else if (tipo === "PERCENT") {
                valorFinal = base - (base * (descNum / 100));
            }
            if (valorFinal < 0) valorFinal = 0;
            // arredonda 2 casas
            valorFinal = Math.round(valorFinal * 100) / 100;
        }

        await pool.query(
            `UPDATE agendamentos
       SET pago = ?,
           forma_pagamento = ?,
           pago_em = ?,
           desconto_tipo = ?,
           desconto_valor = ?,
           valor_final = ?
       WHERE id = ?`,
            [
                pago ? 1 : 0,
                forma,
                pago ? new Date() : null,
                pago ? tipo : null,
                pago ? (descNum ?? null) : null,
                pago ? valorFinal : null,
                id
            ]
        );

        res.json({
            mensagem: "Pagamento atualizado com sucesso",
            valor_base: base,
            valor_final: pago ? valorFinal : null
        });
    } catch (error) {
        res.status(500).json({ erro: "Erro ao registrar pagamento", detalhe: error.message });
    }
};

exports.listarHorariosDisponiveis = async (req, res) => {
    try {
        const { data } = req.query;
        if (!data) return res.status(400).json({ erro: "A data é obrigatória" });

        // ocupados (AGENDADO/CONFIRMADO)
        const [ocupadosRows] = await pool.query(
            `SELECT hora_agendamento
       FROM agendamentos
       WHERE data_agendamento = ?
         AND status IN ('AGENDADO', 'CONFIRMADO')`,
            [data]
        );
        const ocupados = ocupadosRows.map(r => String(r.hora_agendamento));

        // bloqueios (proprietária)
        const [bloqueiosRows] = await pool.query(
            `SELECT hora_inicio, hora_fim
       FROM bloqueios_agenda
       WHERE data_bloqueio = ?`,
            [data]
        );

        function estaBloqueado(horario) {
            return bloqueiosRows.some(b => {
                const ini = String(b.hora_inicio);
                const fim = String(b.hora_fim);
                return (horario >= ini) && (horario < fim);
            });
        }

        const disponiveis = HORARIOS_PADRAO.filter(h => !ocupados.includes(h) && !estaBloqueado(h));
        res.json(disponiveis);
    } catch (error) {
        res.status(500).json({ erro: "Erro ao listar horários disponíveis", detalhe: error.message });
    }
};

exports.criarAgendamentoPublico = async (req, res) => {
    try {
        const {
            nome,
            telefone,
            email,
            servico_id,
            servico_id_2,
            data_agendamento,
            hora_agendamento,
            observacoes
        } = req.body;

        if (!servico_id || !data_agendamento || !hora_agendamento) {
            return res.status(400).json({ erro: "Serviço, data e horário são obrigatórios" });
        }

        // conflito
        const [conflito] = await pool.query(
            `SELECT id
       FROM agendamentos
       WHERE data_agendamento = ?
         AND hora_agendamento = ?
         AND status IN ('AGENDADO', 'CONFIRMADO')`,
            [data_agendamento, hora_agendamento]
        );
        if (conflito.length > 0) {
            return res.status(400).json({ erro: "Esse horário acabou de ser ocupado. Escolha outro." });
        }

        // resolve cliente por telefone ou cria
        const tel = limparTelefone(telefone);
        let clienteId = null;

        if (tel) {
            const [cTel] = await pool.query("SELECT id FROM clientes WHERE telefone = ? LIMIT 1", [tel]);
            if (cTel.length > 0) clienteId = cTel[0].id;
        }

        if (!clienteId) {
            if (!nome || !tel) {
                return res.status(400).json({ erro: "Para novo cadastro, nome e telefone são obrigatórios" });
            }
            const [novoCliente] = await pool.query(
                "INSERT INTO clientes (nome, telefone, email, observacoes) VALUES (?, ?, ?, ?)",
                [nome, tel, email || null, null]
            );
            clienteId = novoCliente.insertId;
        }

        // serviços (suporta 2)
        const s1 = Number(servico_id);
        let s2 = servico_id_2 ? Number(servico_id_2) : null;
        if (s2 === s1) s2 = null;

        const [[serv1]] = await pool.query("SELECT id, valor FROM servicos WHERE id = ?", [s1]);
        if (!serv1) return res.status(404).json({ erro: "Serviço 1 não encontrado" });

        let valorTotal = Number(serv1.valor || 0);
        if (s2) {
            const [[serv2]] = await pool.query("SELECT id, valor FROM servicos WHERE id = ?", [s2]);
            if (!serv2) return res.status(404).json({ erro: "Serviço 2 não encontrado" });
            valorTotal += Number(serv2.valor || 0);
        }

        const [result] = await pool.query(
            `INSERT INTO agendamentos
       (cliente_id, servico_id, servico_id_2, data_agendamento, hora_agendamento, observacoes, valor_cobrado, status, pago, forma_pagamento)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'AGENDADO', 0, 'PENDENTE')`,
            [clienteId, s1, s2, data_agendamento, hora_agendamento, observacoes || null, valorTotal]
        );

        res.status(201).json({ mensagem: "Agendamento realizado com sucesso!", id: result.insertId });
    } catch (error) {
        res.status(500).json({ erro: "Erro ao criar agendamento público", detalhe: error.message });
    }
};

// cria agendamento pelo painel (ADMIN)
exports.criarAdmin = async (req, res) => {
    try {
        const {
            cliente_id,
            telefone,
            nome,
            email,
            servico_id,
            servico_id_2,
            data_agendamento,
            hora_agendamento,
            observacoes
        } = req.body;

        if (!servico_id || !data_agendamento || !hora_agendamento) {
            return res.status(400).json({ erro: "Serviço, data e horário são obrigatórios" });
        }

        // localizar/criar cliente
        const telLimpo = limparTelefone(telefone);
        let clienteId = cliente_id ? Number(cliente_id) : null;

        if (!clienteId) {
            if (!telLimpo) return res.status(400).json({ erro: "Informe telefone ou cliente_id" });

            const [cRows] = await pool.query("SELECT id FROM clientes WHERE telefone = ? LIMIT 1", [telLimpo]);
            if (cRows.length > 0) {
                clienteId = cRows[0].id;
            } else {
                if (!nome) return res.status(400).json({ erro: "Cliente não encontrado. Informe o nome para cadastrar." });

                const [ins] = await pool.query(
                    "INSERT INTO clientes (nome, telefone, email) VALUES (?, ?, ?)",
                    [nome, telLimpo, email || null]
                );
                clienteId = ins.insertId;
            }
        }

        // conflito
        const [conf] = await pool.query(
            `SELECT id FROM agendamentos
       WHERE data_agendamento = ?
         AND hora_agendamento = ?
         AND status IN ('AGENDADO', 'CONFIRMADO')`,
            [data_agendamento, hora_agendamento]
        );
        if (conf.length > 0) return res.status(400).json({ erro: "Esse horário já está ocupado" });

        // serviços (suporta 2)
        const s1 = Number(servico_id);
        let s2 = servico_id_2 ? Number(servico_id_2) : null;
        if (s2 === s1) s2 = null;

        const [[serv1]] = await pool.query("SELECT id, valor FROM servicos WHERE id = ?", [s1]);
        if (!serv1) return res.status(404).json({ erro: "Serviço 1 não encontrado" });

        let valorTotal = Number(serv1.valor || 0);

        if (s2) {
            const [[serv2]] = await pool.query("SELECT id, valor FROM servicos WHERE id = ?", [s2]);
            if (!serv2) return res.status(404).json({ erro: "Serviço 2 não encontrado" });
            valorTotal += Number(serv2.valor || 0);
        }

        // cria como CONFIRMADO (feito pelo salão)
        const [result] = await pool.query(
            `INSERT INTO agendamentos
       (cliente_id, servico_id, servico_id_2, data_agendamento, hora_agendamento, observacoes, valor_cobrado, status, pago, forma_pagamento)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'CONFIRMADO', 0, 'PENDENTE')`,
            [clienteId, s1, s2, data_agendamento, hora_agendamento, observacoes || null, valorTotal]
        );

        res.status(201).json({ mensagem: "Agendamento criado com sucesso", id: result.insertId });
    } catch (e) {
        res.status(500).json({ erro: "Erro ao criar agendamento", detalhe: e.message });
    }
};