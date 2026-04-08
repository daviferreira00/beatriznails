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
                c.id AS cliente_id,
                c.nome AS cliente,
                c.telefone,
                s.id AS servico_id,
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
        res.status(500).json({
            erro: "Erro ao listar agendamentos",
            detalhe: error.message
        });
    }
};

exports.criar = async (req, res) => {
    try {
        const {
            cliente_id,
            servico_id,
            data_agendamento,
            hora_agendamento,
            observacoes
        } = req.body;

        if (!cliente_id || !servico_id || !data_agendamento || !hora_agendamento) {
            return res.status(400).json({
                erro: "cliente_id, servico_id, data_agendamento e hora_agendamento são obrigatórios"
            });
        }

        const [clienteRows] = await pool.query(
            "SELECT id FROM clientes WHERE id = ?",
            [cliente_id]
        );

        if (clienteRows.length === 0) {
            return res.status(404).json({ erro: "Cliente não encontrado" });
        }

        const [servicoRows] = await pool.query(
            "SELECT id, valor FROM servicos WHERE id = ?",
            [servico_id]
        );

        if (servicoRows.length === 0) {
            return res.status(404).json({ erro: "Serviço não encontrado" });
        }

        const [conflito] = await pool.query(
            `SELECT id
             FROM agendamentos
             WHERE data_agendamento = ?
               AND hora_agendamento = ?
               AND status IN ('AGENDADO', 'CONFIRMADO')`,
            [data_agendamento, hora_agendamento]
        );

        if (conflito.length > 0) {
            return res.status(400).json({
                erro: "Já existe um agendamento para esse horário"
            });
        }

        const valorServico = servicoRows[0].valor;

        const [result] = await pool.query(
            `INSERT INTO agendamentos
             (cliente_id, servico_id, data_agendamento, hora_agendamento, observacoes, valor_cobrado)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                cliente_id,
                servico_id,
                data_agendamento,
                hora_agendamento,
                observacoes || null,
                valorServico
            ]
        );

        res.status(201).json({
            mensagem: "Agendamento criado com sucesso",
            id: result.insertId
        });
    } catch (error) {
        res.status(500).json({
            erro: "Erro ao criar agendamento",
            detalhe: error.message
        });
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

        const [agendamentoRows] = await pool.query(
            "SELECT id FROM agendamentos WHERE id = ?",
            [id]
        );

        if (agendamentoRows.length === 0) {
            return res.status(404).json({ erro: "Agendamento não encontrado" });
        }

        await pool.query(
            "UPDATE agendamentos SET status = ? WHERE id = ?",
            [status, id]
        );

        res.json({ mensagem: "Status atualizado com sucesso" });
    } catch (error) {
        res.status(500).json({
            erro: "Erro ao atualizar status",
            detalhe: error.message
        });
    }
};

exports.registrarPagamento = async (req, res) => {
    try {
        const { id } = req.params;
        const { pago, forma_pagamento } = req.body;

        const formasValidas = ["DINHEIRO", "PIX", "CARTAO", "PENDENTE"];

        if (typeof pago !== "boolean") {
            return res.status(400).json({
                erro: "O campo 'pago' deve ser true ou false"
            });
        }

        if (!forma_pagamento || !formasValidas.includes(forma_pagamento)) {
            return res.status(400).json({
                erro: "Forma de pagamento inválida"
            });
        }

        const [agendamentoRows] = await pool.query(
            "SELECT id FROM agendamentos WHERE id = ?",
            [id]
        );

        if (agendamentoRows.length === 0) {
            return res.status(404).json({ erro: "Agendamento não encontrado" });
        }

        await pool.query(
            "UPDATE agendamentos SET pago = ?, forma_pagamento = ? WHERE id = ?",
            [pago, forma_pagamento, id]
        );

        res.json({ mensagem: "Pagamento atualizado com sucesso" });
    } catch (error) {
        res.status(500).json({
            erro: "Erro ao registrar pagamento",
            detalhe: error.message
        });
    }
};

exports.listarHorariosDisponiveis = async (req, res) => {
    try {
        const { data } = req.query;

        if (!data) {
            return res.status(400).json({ erro: "A data é obrigatória" });
        }

        // 1) ocupados por agendamentos
        const [ocupadosRows] = await pool.query(
            `SELECT hora_agendamento
             FROM agendamentos
             WHERE data_agendamento = ?
               AND status IN ('AGENDADO', 'CONFIRMADO')`,
            [data]
        );

        const ocupados = ocupadosRows.map(r => String(r.hora_agendamento));

        // 2) bloqueios da proprietária
        const [bloqueiosRows] = await pool.query(
            `SELECT hora_inicio, hora_fim
       FROM bloqueios_agenda
       WHERE data_bloqueio = ?`,
            [data]
        );

        function estaBloqueado(horario) {
            // horario = "HH:MM:SS"
            return bloqueiosRows.some(b => {
                const ini = String(b.hora_inicio);
                const fim = String(b.hora_fim);
                return (horario >= ini) && (horario < fim);
            });
        }

        // 3) remove ocupados e bloqueados
        const disponiveis = HORARIOS_PADRAO.filter(h => !ocupados.includes(h) && !estaBloqueado(h));

        res.json(disponiveis);
    } catch (error) {
        res.status(500).json({
            erro: "Erro ao listar horários disponíveis",
            detalhe: error.message
        });
    }
};

exports.criarAgendamentoPublico = async (req, res) => {
    try {
        const {
            nome,
            telefone,
            email,
            servico_id,
            data_agendamento,
            hora_agendamento,
            observacoes
        } = req.body;

        if (!servico_id || !data_agendamento || !hora_agendamento) {
            return res.status(400).json({
                erro: "Serviço, data e horário são obrigatórios"
            });
        }

        const [servicoRows] = await pool.query(
            "SELECT id, valor FROM servicos WHERE id = ?",
            [servico_id]
        );

        if (servicoRows.length === 0) {
            return res.status(404).json({ erro: "Serviço não encontrado" });
        }

        const [conflito] = await pool.query(
            `SELECT id
             FROM agendamentos
             WHERE data_agendamento = ?
               AND hora_agendamento = ?
               AND status IN ('AGENDADO', 'CONFIRMADO')`,
            [data_agendamento, hora_agendamento]
        );

        if (conflito.length > 0) {
            return res.status(400).json({
                erro: "Esse horário acabou de ser ocupado. Escolha outro."
            });
        }

        const telefoneLimpo = limparTelefone(telefone);
        let clienteId;

        if (telefoneLimpo) {
            const [clientePorTelefone] = await pool.query(
                "SELECT id FROM clientes WHERE telefone = ? LIMIT 1",
                [telefoneLimpo]
            );

            if (clientePorTelefone.length > 0) {
                clienteId = clientePorTelefone[0].id;
            }
        }

        if (!clienteId) {
            if (!nome || !telefoneLimpo) {
                return res.status(400).json({
                    erro: "Para novo cadastro, nome e telefone são obrigatórios"
                });
            }

            const [novoCliente] = await pool.query(
                "INSERT INTO clientes (nome, telefone, email, observacoes) VALUES (?, ?, ?, ?)",
                [nome, telefoneLimpo, email || null, null]
            );

            clienteId = novoCliente.insertId;
        }

        const valorServico = servicoRows[0].valor;

        const [result] = await pool.query(
            `INSERT INTO agendamentos
             (cliente_id, servico_id, data_agendamento, hora_agendamento, observacoes, valor_cobrado, status)
             VALUES (?, ?, ?, ?, ?, ?, 'AGENDADO')`,
            [
                clienteId,
                servico_id,
                data_agendamento,
                hora_agendamento,
                observacoes || null,
                valorServico
            ]
        );

        res.status(201).json({
            mensagem: "Agendamento realizado com sucesso!",
            id: result.insertId
        });
    } catch (error) {
        res.status(500).json({
            erro: "Erro ao criar agendamento público",
            detalhe: error.message
        });
    }
};