<!DOCTYPE html>
<html lang="pt-BR">
    <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Serviços | Beatriz Beauty</title>
<script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-[#f7f2f5] min-h-screen">

<div id="sidebar"></div>

<div class="min-h-screen md:ml-72">
    <header class="bg-white/95 border-b border-[#eadde5] px-4 md:px-8 py-4">
        <div class="flex items-center gap-3">
            <button id="openSidebar" class="md:hidden bg-[#b78ea5] text-white px-3 py-2 rounded-xl">☰</button>

            <div class="flex items-center gap-3">
                <img
                    src="/assets/logo-beatriz-beauty.jpg"
                    alt="Logo"
                    class="w-12 h-12 rounded-2xl object-cover border border-[#efe4ea]"
                />
                <div>
                    <h1 class="text-2xl font-semibold text-[#b78ea5]">Serviços</h1>
                    <p class="text-sm text-[#7d6a75]">Cadastre, edite e inative serviços do salão</p>
                </div>
            </div>
        </div>
    </header>

    <main class="max-w-7xl mx-auto p-4 md:p-8">
        <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">

            <!-- Form Novo Serviço -->
            <section class="xl:col-span-1 bg-white rounded-3xl border border-[#eadde5] p-6 shadow-sm">
                <h2 class="text-xl font-semibold text-[#3f3138] mb-4">Novo serviço</h2>

                <form id="formServico" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-[#5e4b55] mb-2">Nome do serviço</label>
                        <input
                            id="nome"
                            type="text"
                            placeholder="Ex: Banho em gel"
                            required
                            class="w-full rounded-2xl border border-[#e8d9e2] px-4 py-3 outline-none focus:ring-4 focus:ring-[#f3e7ee] focus:border-[#c29ab0]"
                        />
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-[#5e4b55] mb-2">Valor (R$)</label>
                        <input
                            id="valor"
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Ex: 80.00"
                            required
                            class="w-full rounded-2xl border border-[#e8d9e2] px-4 py-3 outline-none focus:ring-4 focus:ring-[#f3e7ee] focus:border-[#c29ab0]"
                        />
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-[#5e4b55] mb-2">Duração (minutos)</label>
                        <input
                            id="duracao"
                            type="number"
                            min="1"
                            placeholder="Ex: 90"
                            required
                            class="w-full rounded-2xl border border-[#e8d9e2] px-4 py-3 outline-none focus:ring-4 focus:ring-[#f3e7ee] focus:border-[#c29ab0]"
                        />
                    </div>

                    <button
                        id="btnCadastrar"
                        type="submit"
                        class="w-full rounded-2xl bg-[#b78ea5] text-white py-3.5 font-semibold hover:bg-[#a97f97] transition disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        Cadastrar serviço
                    </button>
                </form>

                <div id="mensagem" class="hidden mt-4 rounded-2xl px-4 py-3 text-sm font-medium text-center"></div>

                <div class="mt-6 rounded-3xl border border-[#efe4ea] bg-[#fcfafb] p-5">
                    <p class="text-sm font-semibold text-[#3f3138]">Dica</p>
                    <p class="text-sm text-[#7d6a75] mt-2">
                        Em vez de excluir, use <strong>Inativar</strong> para que o serviço não apareça no agendamento público.
                    </p>
                </div>
            </section>

            <!-- Lista Serviços -->
            <section class="xl:col-span-2 bg-white rounded-3xl border border-[#eadde5] p-6 shadow-sm">
                <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
                    <div>
                        <h2 class="text-xl font-semibold text-[#3f3138]">Serviços cadastrados</h2>
                        <p class="text-sm text-[#7d6a75]">Edite e controle quais serviços ficam disponíveis.</p>
                    </div>

                    <div class="flex flex-col sm:flex-row gap-3">
                        <label class="flex items-center gap-2 text-sm text-[#5e4b55] bg-[#fcfafb] border border-[#efe4ea] px-4 py-3 rounded-2xl">
                            <input id="mostrarInativos" type="checkbox" class="accent-[#b78ea5]" />
                            Mostrar inativos
                        </label>

                        <button
                            id="atualizarLista"
                            class="bg-[#f3e7ee] text-[#b78ea5] hover:bg-[#eddce6] px-4 py-3 rounded-2xl font-medium transition"
                        >
                            Atualizar
                        </button>
                    </div>
                </div>

                <div id="listaServicos" class="grid grid-cols-1 md:grid-cols-2 gap-4"></div>
            </section>

        </div>
    </main>
</div>

<!-- Modal Editar -->
<div id="modalEditar" class="fixed inset-0 z-[60] hidden">
    <div id="overlayEditar" class="absolute inset-0 bg-black/40"></div>

    <div class="relative mx-auto mt-10 w-[95%] max-w-xl">
        <div class="bg-white rounded-3xl border border-[#eadde5] shadow-2xl overflow-hidden">
            <div class="px-6 py-5 border-b border-[#eadde5] flex items-center justify-between">
                <div>
                    <h3 class="text-xl font-semibold text-[#3f3138]">Editar serviço</h3>
                    <p class="text-sm text-[#7d6a75]">Atualize nome, valor e duração.</p>
                </div>
                <button id="fecharEditar" class="text-[#7d6a75] hover:text-[#3f3138] text-2xl leading-none">×</button>
            </div>

            <div class="p-6">
                <form id="formEditar" class="space-y-4">
                    <input type="hidden" id="editar_id" />

                    <div>
                        <label class="block text-sm font-medium text-[#5e4b55] mb-2">Nome do serviço</label>
                        <input
                            id="editar_nome"
                            type="text"
                            required
                            class="w-full rounded-2xl border border-[#e8d9e2] px-4 py-3 outline-none focus:ring-4 focus:ring-[#f3e7ee] focus:border-[#c29ab0]"
                        />
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-[#5e4b55] mb-2">Valor (R$)</label>
                        <input
                            id="editar_valor"
                            type="number"
                            step="0.01"
                            min="0"
                            required
                            class="w-full rounded-2xl border border-[#e8d9e2] px-4 py-3 outline-none focus:ring-4 focus:ring-[#f3e7ee] focus:border-[#c29ab0]"
                        />
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-[#5e4b55] mb-2">Duração (minutos)</label>
                        <input
                            id="editar_duracao"
                            type="number"
                            min="1"
                            required
                            class="w-full rounded-2xl border border-[#e8d9e2] px-4 py-3 outline-none focus:ring-4 focus:ring-[#f3e7ee] focus:border-[#c29ab0]"
                        />
                    </div>

                    <div class="flex flex-col sm:flex-row gap-3 pt-2">
                        <button
                            id="btnSalvarEdicao"
                            type="submit"
                            class="w-full rounded-2xl bg-[#b78ea5] text-white py-3 font-semibold hover:bg-[#a97f97] transition disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            Salvar alterações
                        </button>
                        <button
                            id="btnCancelarEdicao"
                            type="button"
                            class="w-full rounded-2xl bg-[#f3e7ee] text-[#b78ea5] py-3 font-semibold hover:bg-[#eddce6] transition"
                        >
                            Cancelar
                        </button>
                    </div>

                    <div id="msgEditar" class="hidden rounded-2xl px-4 py-3 text-sm font-medium text-center"></div>
                </form>
            </div>
        </div>
    </div>
</div>

<script src="/components/sidebar.js"></script>
<script src="/components/auth.js"></script>

<script>
    const formServico = document.getElementById("formServico");
    const listaServicos = document.getElementById("listaServicos");
    const mensagem = document.getElementById("mensagem");
    const atualizarListaBtn = document.getElementById("atualizarLista");
    const mostrarInativosChk = document.getElementById("mostrarInativos");
    const btnCadastrar = document.getElementById("btnCadastrar");

    // Modal
    const modalEditar = document.getElementById("modalEditar");
    const overlayEditar = document.getElementById("overlayEditar");
    const fecharEditar = document.getElementById("fecharEditar");
    const btnCancelarEdicao = document.getElementById("btnCancelarEdicao");
    const formEditar = document.getElementById("formEditar");
    const msgEditar = document.getElementById("msgEditar");
    const btnSalvarEdicao = document.getElementById("btnSalvarEdicao");

    const editar_id = document.getElementById("editar_id");
    const editar_nome = document.getElementById("editar_nome");
    const editar_valor = document.getElementById("editar_valor");
    const editar_duracao = document.getElementById("editar_duracao");

    let cacheServicos = [];

    function showMsg(el, texto, tipo="erro") {
    el.textContent = texto;
    el.className = "rounded-2xl px-4 py-3 text-sm font-medium text-center block";
    if (tipo === "sucesso") el.classList.add("bg-green-50","text-green-700","border","border-green-200");
    else el.classList.add("bg-red-50","text-red-700","border","border-red-200");
}
    function hideMsg(el) {
    el.textContent = "";
    el.className = "hidden rounded-2xl px-4 py-3 text-sm font-medium text-center";
}

    function mostrarMensagem(texto, tipo="erro") {
    showMsg(mensagem, texto, tipo);
    mensagem.classList.add("mt-4");
}
    function limparMensagem() {
    mensagem.textContent = "";
    mensagem.className = "hidden mt-4 rounded-2xl px-4 py-3 text-sm font-medium text-center";
}

    function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

    function isAtivo(servico) {
    // suporta 1/0, true/false, "1"/"0"
    return String(servico.ativo ?? 1) === "1" || servico.ativo === true;
}

    function badgeStatus(servico) {
    if (isAtivo(servico)) {
    return `<span class="inline-flex items-center px-2 py-1 rounded-xl text-[11px] font-semibold bg-green-50 text-green-700 border border-green-200">ATIVO</span>`;
}
    return `<span class="inline-flex items-center px-2 py-1 rounded-xl text-[11px] font-semibold bg-gray-50 text-gray-700 border border-gray-200">INATIVO</span>`;
}

    function criarCardServico(servico) {
    const card = document.createElement("div");
    card.className = `rounded-3xl border border-[#efe4ea] p-5 ${isAtivo(servico) ? "bg-[#fcfafb]" : "bg-white opacity-90"}`;

    const textoAtivoBtn = isAtivo(servico) ? "Inativar" : "Ativar";
    const classeAtivoBtn = isAtivo(servico)
    ? "bg-red-50 hover:bg-red-100 text-red-600"
    : "bg-green-50 hover:bg-green-100 text-green-700";

    card.innerHTML = `
      <div class="flex items-start justify-between gap-4">
        <div class="min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <h3 class="text-lg font-semibold text-[#3f3138] break-words">${servico.nome}</h3>
            ${badgeStatus(servico)}
          </div>
          <p class="text-sm text-[#7d6a75] mt-2">⏱️ Duração: ${servico.duracao_minutos} min</p>
          <p class="text-[#b78ea5] font-semibold mt-3">${formatarMoeda(servico.valor)}</p>
        </div>

        <div class="flex flex-col gap-2 shrink-0">
          <button
            class="btn-editar bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-2 rounded-2xl font-medium transition"
            data-id="${servico.id}"
          >
            Editar
          </button>

          <button
            class="btn-toggle ${classeAtivoBtn} px-3 py-2 rounded-2xl font-medium transition"
            data-id="${servico.id}"
            data-ativo="${isAtivo(servico) ? "1" : "0"}"
          >
            ${textoAtivoBtn}
          </button>
        </div>
      </div>
    `;
    return card;
}

    function abrirModalEdicao(servico) {
    hideMsg(msgEditar);

    editar_id.value = servico.id;
    editar_nome.value = servico.nome || "";
    editar_valor.value = Number(servico.valor || 0).toFixed(2);
    editar_duracao.value = servico.duracao_minutos || 60;

    modalEditar.classList.remove("hidden");
    setTimeout(() => editar_nome.focus(), 50);
}

    function fecharModalEdicao() {
    modalEditar.classList.add("hidden");
    formEditar.reset();
    hideMsg(msgEditar);
}

    async function carregarServicos() {
    listaServicos.innerHTML = `<div class="col-span-full text-[#7d6a75]">Carregando serviços...</div>`;

    try {
    const response = await fetch("/api/servicos");
    const servicos = await response.json();

    if (!response.ok) throw new Error(servicos.erro || "Erro ao listar serviços");

    cacheServicos = Array.isArray(servicos) ? servicos : [];

    // filtra inativos se checkbox não marcado
    const mostrarInativos = !!mostrarInativosChk.checked;
    const lista = mostrarInativos ? cacheServicos : cacheServicos.filter(s => isAtivo(s));

    listaServicos.innerHTML = "";

    if (!Array.isArray(lista) || lista.length === 0) {
    listaServicos.innerHTML = `
          <div class="col-span-full rounded-3xl border border-dashed border-[#eadde5] p-6 text-center text-[#7d6a75]">
            Nenhum serviço encontrado.
          </div>
        `;
    return;
}

    lista.forEach((servico) => listaServicos.appendChild(criarCardServico(servico)));

    // Eventos: Editar
    document.querySelectorAll(".btn-editar").forEach((btn) => {
    btn.addEventListener("click", () => {
    const id = btn.dataset.id;
    const serv = cacheServicos.find(s => String(s.id) === String(id));
    if (!serv) return;
    abrirModalEdicao(serv);
});
});

    // Eventos: Ativar/Inativar
    document.querySelectorAll(".btn-toggle").forEach((btn) => {
    btn.addEventListener("click", async () => {
    const id = btn.dataset.id;
    const ativoAtual = btn.dataset.ativo === "1";
    const novoAtivo = !ativoAtual;

    const pergunta = novoAtivo
    ? "Deseja ATIVAR este serviço?"
    : "Deseja INATIVAR este serviço? (Ele não aparecerá no agendamento público)";

    if (!confirm(pergunta)) return;

    try {
    const resp = await fetch(`/api/servicos/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ativo: novoAtivo })
});

    const data = await resp.json();
    if (resp.ok) {
    mostrarMensagem(data.mensagem || "Status atualizado", "sucesso");
    await carregarServicos();
} else {
    mostrarMensagem(data.erro || "Erro ao alterar status");
}
} catch {
    mostrarMensagem("Erro ao conectar com o servidor");
}
});
});

} catch (error) {
    console.error("Erro ao carregar serviços:", error);
    listaServicos.innerHTML = `
        <div class="col-span-full rounded-3xl border border-red-200 bg-red-50 p-6 text-center text-red-600">
          Erro ao carregar serviços.
        </div>
      `;
}
}

    // Cadastrar novo
    formServico.addEventListener("submit", async (e) => {
    e.preventDefault();
    limparMensagem();

    const nome = document.getElementById("nome").value.trim();
    const valor = document.getElementById("valor").value;
    const duracao = document.getElementById("duracao").value;

    if (!nome) return mostrarMensagem("Informe o nome do serviço.");

    try {
    btnCadastrar.disabled = true;

    const response = await fetch("/api/servicos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome, valor, duracao_minutos: duracao })
});

    const data = await response.json();

    if (response.ok) {
    mostrarMensagem(data.mensagem || "Serviço cadastrado com sucesso", "sucesso");
    formServico.reset();
    carregarServicos();
} else {
    mostrarMensagem(data.erro || "Erro ao cadastrar serviço");
}
} catch {
    mostrarMensagem("Erro ao conectar com o servidor");
} finally {
    btnCadastrar.disabled = false;
}
});

    // Salvar edição
    formEditar.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideMsg(msgEditar);

    const id = editar_id.value;
    const payload = {
    nome: editar_nome.value.trim(),
    valor: editar_valor.value,
    duracao_minutos: editar_duracao.value
};

    if (!payload.nome) return showMsg(msgEditar, "Informe o nome do serviço.");

    try {
    btnSalvarEdicao.disabled = true;
    btnSalvarEdicao.classList.add("opacity-70","cursor-not-allowed");

    const resp = await fetch(`/api/servicos/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
});

    const data = await resp.json();

    if (resp.ok) {
    showMsg(msgEditar, data.mensagem || "Serviço atualizado com sucesso", "sucesso");
    await carregarServicos();
    setTimeout(fecharModalEdicao, 600);
} else {
    showMsg(msgEditar, data.erro || "Erro ao salvar alterações");
}
} catch {
    showMsg(msgEditar, "Erro ao conectar com o servidor");
} finally {
    btnSalvarEdicao.disabled = false;
    btnSalvarEdicao.classList.remove("opacity-70","cursor-not-allowed");
}
});

    // Modal eventos
    overlayEditar.addEventListener("click", fecharModalEdicao);
    fecharEditar.addEventListener("click", fecharModalEdicao);
    btnCancelarEdicao.addEventListener("click", fecharModalEdicao);

    // Filtros/Atualizar
    atualizarListaBtn.addEventListener("click", carregarServicos);
    mostrarInativosChk.addEventListener("change", carregarServicos);

    carregarServicos();
</script>
</body>
</html>