const pool = require("../db/connection");

// Fallback (se config_agenda não existir/der erro)
const HORARIOS_PADRAO = [
    "08:00:00",
    "09:00:00",
    "10:00:00",
    "11:00:00",
    "13:00:00",
    "14:00:00",
    "15:00:00",
    "16:00:00",
    "17:00:00",
];

function limparTelefone(telefone) {
    return String(telefone || "").replace(/\D/g, "");
}

function toNumber(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

function pad2(n) {
    return String(n).padStart(2, "0");
}

function timeToMinutes(t) {
    // aceita "HH:MM" ou "HH:MM:SS"
    const s = String(t || "").slice(0, 8);
    const [hh, mm] = s.split(":");
    const h = Number(hh);
    const m = Number(mm);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    return h * 60 + m;
}

function minutesToTime(min) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${pad2(h)}:${pad2(m)}:00`;
}

function getDiaSemanaNumero(dataISO) {
    // JS: 0=Dom ... 6=Sáb
    // Padrão do sistema: 1=Seg ... 6=Sáb, Domingo=0
    const d = new Date(`${String(dataISO).slice(0, 10)}T00:00:00`);
    const js = d.getDay(); // 0..6
    if (js === 0) return 0;
    return js; // seg=1..sab=6
}

async function getConfigAgendaSafe() {
    try {
        const [[row]] = await pool.query(
            `SELECT hora_inicio, hora_fim, intervalo_minutos, dias_semana_json, pausa_inicio, pausa_fim
       FROM config_agenda
       ORDER BY id DESC
       LIMIT 1`
        );

        if (!row) return null;

        // dias_semana_json pode vir como string JSON ou como algo "1,2,3"
        let dias = [1, 2, 3, 4, 5, 6];
        if (row.dias_semana_json != null) {
            try {
                if (Array.isArray(row.dias_semana_json)) {
                    dias = row.dias_semana_json;
                } else {
                    const s = String(row.dias_semana_json).trim();
                    if (s.startsWith("[")) dias = JSON.parse(s);
                    else if (s.includes(",")) dias = s.split(",").map(x => Number(String(x).trim()));
                    else {
                        const n = Number(s);
                        dias = Number.isFinite(n) ? [n] : dias;
                    }
                }
            } catch {
                dias = [1, 2, 3, 4, 5, 6];
            }
        }

        const inicio = String(row.hora_inicio || "08:00:00").slice(0, 8);
        const fim = String(row.hora_fim || "17:00:00").slice(0, 8);
        const intervalo = Number(row.intervalo_minutos || 60);

        const pausaInicio = row.pausa_inicio ? String(row.pausa_inicio).slice(0, 8) : null;
        const pausaFim = row.pausa_fim ? String(row.pausa_fim).slice(0, 8) : null;

        return {
            hora_inicio: inicio,
            hora_fim: fim,
            intervalo_minutos: Number.isFinite(intervalo) && intervalo >= 5 ? intervalo : 60,
            dias_semana: Array.isArray(dias) ? dias.map(Number).filter(Number.isFinite) : [1, 2, 3, 4, 5, 6],
            pausa_inicio: pausaInicio,
            pausa_fim: pausaFim,
        };
    } catch {
        return null; // fallback
    }
}

function gerarHorariosPorConfig(cfg) {
    const iniMin = timeToMinutes(cfg.hora_inicio);
    const fimMin = timeToMinutes(cfg.hora_fim);
    const step = Number(cfg.intervalo_minutos || 60);

    if (iniMin == null || fimMin == null || !Number.isFinite(step) || step <= 0) {
        return [...HORARIOS_PADRAO];
    }

    // gera slots [inicio, fim)
    const slots = [];
    for (let m = iniMin; m < fimMin; m += step) {
        slots.push(minutesToTime(m));
    }

    return slots.length ? slots : [...HORARIOS_PADRAO];
}

function estaNaPausa(horario, pausaInicio, pausaFim) {
    if (!pausaInicio || !pausaFim) return false;
    const h = String(horario).slice(0, 8);
    const pi = String(pausaInicio).slice(0, 8);
    const pf = String(pausaFim).slice(0, 8);
    return h >= pi && h < pf;
}

async function getDisponiveisParaData(dataISO) {
    // 1) config semanal
    const cfg =
        (await getConfigAgendaSafe()) || {
            hora_inicio: "08:00:00",
            hora_fim: "17:00:00",
            intervalo_minutos: 60,
            dias_semana: [1, 2, 3, 4, 5, 6],
            pausa_inicio: null,
            pausa_fim: null,
        };

    const diaSemana = getDiaSemanaNumero(dataISO);

    // domingo ou dia fora da lista => sem atendimento
    if (diaSemana === 0 || !cfg.dias_semana.includes(diaSemana)) {
        return [];
    }

    // 2) horários base gerados
    let baseSlots = gerarHorariosPorConfig(cfg);

    // 2.1) remove horários durante a pausa (ex.: 12:00–13:30)
    if (cfg.pausa_inicio && cfg.pausa_fim) {
        baseSlots = baseSlots.filter(h => !estaNaPausa(h, cfg.pausa_inicio, cfg.pausa_fim));
    }

    // 3) ocupados (AGENDADO/CONFIRMADO)
    const [ocupadosRows] = await pool.query(
        `SELECT hora_agendamento
     FROM agendamentos
     WHERE data_agendamento = ?
       AND status IN ('AGENDADO', 'CONFIRMADO')`,
        [dataISO]
    );
    const ocupados = new Set(ocupadosRows.map((r) => String(r.hora_agendamento).slice(0, 8)));

    // 4) bloqueios (admin)
    const [bloqueiosRows] = await pool.query(
        `SELECT hora_inicio, hora_fim
     FROM bloqueios_agenda
     WHERE data_bloqueio = ?`,
        [dataISO]
    );

    function estaBloqueado(horario) {
        const h = String(horario).slice(0, 8);
        return bloqueiosRows.some((b) => {
            const ini = String(b.hora_inicio).slice(0, 8);
            const fim = String(b.hora_fim).slice(0, 8);
            return h >= ini && h < fim;
        });
    }

    // 5) filtra
    return baseSlots.filter((h) => !ocupados.has(String(h).slice(0, 8)) && !estaBloqueado(h));
}

/* ============================
 * LISTAR AGENDAMENTOS (ADMIN)
 * ============================ */
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
                erro: "cliente_id, servico_id, data_agendamento e hora_agendamento são obrigatórios",
            });
        }

        const [clienteRows] = await pool.query("SELECT id FROM clientes WHERE id = ?", [cliente_id]);
        if (clienteRows.length === 0) return res.status(404).json({ erro: "Cliente não encontrado" });

        const [[serv1]] = await pool.query("SELECT id, valor FROM servicos WHERE id = ?", [servico_id]);
        if (!serv1) return res.status(404).json({ erro: "Serviço não encontrado" });

        const disponiveis = await getDisponiveisParaData(data_agendamento);
        if (!disponiveis.includes(String(hora_agendamento).slice(0, 8))) {
            return res.status(400).json({ erro: "Horário indisponível para essa data" });
        }

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

        const [[ag]] = await pool.query("SELECT id, valor_cobrado FROM agendamentos WHERE id = ?", [id]);
        if (!ag) return res.status(404).json({ erro: "Agendamento não encontrado" });

        const base = Number(ag.valor_cobrado || 0);

        const tipo = desconto_tipo ? String(desconto_tipo).toUpperCase() : null;
        const tiposValidos = [null, "VALOR", "PERCENT"];
        if (!tiposValidos.includes(tipo)) {
            return res.status(400).json({ erro: "desconto_tipo inválido" });
        }

        const descNum = desconto_valor === "" || desconto_valor == null ? null : toNumber(desconto_valor);
        if (descNum != null && descNum < 0) {
            return res.status(400).json({ erro: "desconto_valor inválido" });
        }

        let valorFinal = base;
        if (pago && tipo && descNum != null) {
            if (tipo === "VALOR") valorFinal = base - descNum;
            else if (tipo === "PERCENT") valorFinal = base - base * (descNum / 100);

            if (valorFinal < 0) valorFinal = 0;
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
                id,
            ]
        );

        res.json({
            mensagem: "Pagamento atualizado com sucesso",
            valor_base: base,
            valor_final: pago ? valorFinal : null,
        });
    } catch (error) {
        res.status(500).json({ erro: "Erro ao registrar pagamento", detalhe: error.message });
    }
};

/**
 * GET /api/agendamentos/disponiveis?data=YYYY-MM-DD
 * Usa config_agenda (agenda semanal) + pausa + bloqueios + ocupados
 */
exports.listarHorariosDisponiveis = async (req, res) => {
    try {
        const { data } = req.query;
        if (!data) return res.status(400).json({ erro: "A data é obrigatória" });

        const d = String(data).slice(0, 10);
        const disponiveis = await getDisponiveisParaData(d);
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
            observacoes,
        } = req.body;

        if (!servico_id || !data_agendamento || !hora_agendamento) {
            return res.status(400).json({ erro: "Serviço, data e horário são obrigatórios" });
        }

        const disponiveis = await getDisponiveisParaData(data_agendamento);
        if (!disponiveis.includes(String(hora_agendamento).slice(0, 8))) {
            return res.status(400).json({ erro: "Esse horário não está disponível. Escolha outro." });
        }

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
            observacoes,
        } = req.body;

        if (!servico_id || !data_agendamento || !hora_agendamento) {
            return res.status(400).json({ erro: "Serviço, data e horário são obrigatórios" });
        }

        const disponiveis = await getDisponiveisParaData(data_agendamento);
        if (!disponiveis.includes(String(hora_agendamento).slice(0, 8))) {
            return res.status(400).json({ erro: "Horário indisponível para essa data" });
        }

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
       VALUES (?, ?, ?, ?, ?, ?, ?, 'CONFIRMADO', 0, 'PENDENTE')`,
            [clienteId, s1, s2, data_agendamento, hora_agendamento, observacoes || null, valorTotal]
        );

        res.status(201).json({ mensagem: "Agendamento criado com sucesso", id: result.insertId });
    } catch (e) {
        res.status(500).json({ erro: "Erro ao criar agendamento", detalhe: e.message });
    }
};