document.addEventListener("DOMContentLoaded", () => {
    const sidebar = document.getElementById("sidebar");
    if (!sidebar) return;

    sidebar.innerHTML = `
    <aside id="sidebarMenu" class="fixed inset-y-0 left-0 z-50 w-72 bg-[#b78ea5] text-white transform -translate-x-full md:translate-x-0 transition-transform duration-300 shadow-2xl">
      <div class="px-5 py-5 border-b border-white/20">
        <div class="flex items-center gap-3">
          <div class="bg-white/95 rounded-2xl p-2 shadow-md">
            <img
              src="/assets/logo-beatriz-beauty.jpg"
              alt="Logo Beatriz Beauty"
              class="w-14 h-14 object-cover rounded-xl"
            />
          </div>

          <div class="min-w-0">
            <h1 class="text-lg font-semibold leading-tight truncate">Beatriz Beauty</h1>
            <p class="text-xs text-white/80">Painel administrativo</p>
          </div>
        </div>
      </div>

      <nav class="p-4 space-y-2">
        <a href="/painel.html" class="flex items-center gap-3 rounded-2xl px-4 py-3 hover:bg-white/15 transition">
          <span>🏠</span>
          <span class="font-medium">DashBoard</span>
        </a>

        <a href="/clientes.html" class="flex items-center gap-3 rounded-2xl px-4 py-3 hover:bg-white/15 transition">
          <span>👩‍💼</span>
          <span class="font-medium">Clientes</span>
        </a>

        <a href="/servicos.html" class="flex items-center gap-3 rounded-2xl px-4 py-3 hover:bg-white/15 transition">
          <span>💅</span>
          <span class="font-medium">Serviços</span>
        </a>

        <a href="/agendamentos.html" class="flex items-center gap-3 rounded-2xl px-4 py-3 hover:bg-white/15 transition">
          <span>📅</span>
          <span class="font-medium">Agendamentos</span>
        </a>

        <a href="/bloqueios.html" class="flex items-center gap-3 rounded-2xl px-4 py-3 hover:bg-white/15 transition">
          <span>⛔</span>
          <span class="font-medium">Bloqueios</span>
        </a>
        
        <a href="/financeiro.html" class="flex items-center gap-3 rounded-2xl px-4 py-3 hover:bg-white/15 transition">
          <span>💰</span>
          <span class="font-medium">Financeiro</span>
        </a>
      </nav>

      <div class="absolute bottom-0 left-0 right-0 p-5 border-t border-white/20">
        <button
          onclick="logout()"
          class="w-full rounded-2xl bg-white text-[#b78ea5] font-semibold py-3 hover:bg-[#f8edf3] transition"
        >
          Sair
        </button>
      </div>
    </aside>

    <div id="sidebarOverlay" class="fixed inset-0 bg-black/40 z-40 hidden md:hidden"></div>
  `;

    const openBtn = document.getElementById("openSidebar");
    const closeBtnId = document.getElementById("closeSidebar");
    const sidebarMenu = document.getElementById("sidebarMenu");
    const overlay = document.getElementById("sidebarOverlay");

    function openSidebar() {
        sidebarMenu.classList.remove("-translate-x-full");
        overlay.classList.remove("hidden");
    }

    function closeSidebar() {
        sidebarMenu.classList.add("-translate-x-full");
        overlay.classList.add("hidden");
    }

    if (openBtn) openBtn.addEventListener("click", openSidebar);
    if (closeBtnId) closeBtnId.addEventListener("click", closeSidebar);
    if (overlay) overlay.addEventListener("click", closeSidebar);

    window.logout = function () {
        localStorage.removeItem("token"); // ✅ apaga o JWT
        window.location.href = "/";       // volta pro login
    };
});