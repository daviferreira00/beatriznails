document.addEventListener("DOMContentLoaded", () => {
    if (!document.querySelector('script[src*="iconify-icon"]')) {
        const script = document.createElement('script');
        script.src = "https://cdn.jsdelivr.net/npm/iconify-icon@1.0.8/dist/iconify-icon.min.js";
        document.head.appendChild(script);
    }

    const sidebar = document.getElementById("sidebar");
    if (!sidebar) return;

    // Recupera os dados salvos no login (incluindo o perfil)
    const userDataRaw = localStorage.getItem("user_data");
    const user = JSON.parse(userDataRaw);

    const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    const sidebarWidth = isCollapsed ? 'md:w-[84px]' : 'md:w-72';
    const textVisibility = isCollapsed ? 'md:hidden' : '';
    const logoJustify = isCollapsed ? 'md:justify-center' : 'justify-between';
    const iconChevron = isCollapsed ? 'lucide:chevron-right' : 'lucide:chevron-left';
    const cardCollapsedClasses = isCollapsed ? 'md:bg-transparent md:p-0 md:border-transparent md:shadow-none md:justify-center' : '';

    // LÓGICA DE VISIBILIDADE DO MENU
    const menuLinks = [
        { href: "/painel", icon: "lucide:layout-dashboard", label: "Dashboard", adminOnly: true },
        { href: "/clientes", icon: "lucide:users", label: "Clientes", adminOnly: false },
        { href: "/servicos", icon: "lucide:scissors", label: "Serviços", adminOnly: true },
        { href: "/agendamentos", icon: "lucide:calendar-days", label: "Agendamentos", adminOnly: false },
        { href: "/bloqueios", icon: "lucide:calendar-off", label: "Bloqueios", adminOnly: true },
        { href: "/financeiro", icon: "lucide:circle-dollar-sign", label: "Financeiro", adminOnly: true },

        // ✅ NOVO: Aniversariantes
        { href: "/aniversariantes.html", icon: "lucide:cake", label: "Aniversariantes", adminOnly: true },

        { href: "/usuarios", icon: "lucide:user-cog", label: "Usuários", adminOnly: true },
    ];

    const linksVisiveis = menuLinks.filter(link => {
        if (user.perfil === 'admin') return true;
        return !link.adminOnly;
    });

    const htmlLinks = linksVisiveis.map(link => `
        <a href="${link.href}" class="flex items-center gap-3 rounded-2xl px-3 py-3 hover:bg-white/15 transition group" title="${link.label}">
          <iconify-icon icon="${link.icon}" width="22"></iconify-icon>
          <span class="sidebar-text font-medium ${textVisibility}">${link.label}</span>
        </a>
    `).join('');

    sidebar.innerHTML = `
    <aside id="sidebarMenu" class="fixed inset-y-0 left-0 z-50 w-72 ${sidebarWidth} bg-[#b78ea5] text-white transform -translate-x-full md:translate-x-0 transition-all duration-300 shadow-2xl flex flex-col">
      
      <div class="px-4 py-5 border-b border-white/10 flex items-center ${logoJustify} relative min-h-[90px]">
        <div class="flex items-center gap-3 overflow-hidden">
          <div class="bg-white/95 rounded-2xl p-2 shadow-md shrink-0">
            <img src="/assets/logo-beatriz-beauty.jpg" alt="Logo" class="w-10 h-10 object-cover rounded-xl" />
          </div>
          <div class="sidebar-text ${textVisibility} transition-opacity duration-300">
            <h1 class="text-base font-semibold leading-tight truncate">Beatriz Beauty</h1>
          </div>
        </div>
        
        <button id="toggleDesktopSidebar" class="hidden md:flex absolute -right-3.5 top-8 bg-white text-[#b78ea5] rounded-full p-1 shadow-md z-50 border border-[#eadde5]">
          <iconify-icon id="toggleIcon" icon="${iconChevron}" width="20"></iconify-icon>
        </button>
      </div>

      <div class="px-4 py-6">
        <a href="/perfil" class="block hover:opacity-90 transition w-full" title="Acessar meu perfil">
            <div id="userCard" class="flex items-center gap-4 bg-white/10 p-4 rounded-[1.5rem] border border-white/5 overflow-hidden shadow-sm transition-all duration-300 ${cardCollapsedClasses}">
                <img src="${user.foto || '/assets/logo-beatriz-beauty.jpg'}" class="w-12 h-12 rounded-xl object-cover border-2 border-white/20 shrink-0" />
                <div class="sidebar-text ${textVisibility} min-w-0 flex flex-col justify-center">
                    <p class="text-base font-bold truncate leading-tight">${user.nome}</p>
                    <p class="text-[11px] text-white/70 truncate mt-0.5">${user.email}</p>
                </div>
            </div>
        </a>
      </div>

      <nav class="p-4 pt-0 space-y-1 flex-1 overflow-y-auto">
        ${htmlLinks}
      </nav>

      <div class="p-4 border-t border-white/10">
        <button onclick="logout()" class="w-full flex items-center justify-center gap-3 rounded-2xl bg-white text-[#b78ea5] font-semibold py-3 hover:bg-[#f8edf3] transition" title="Sair">
          <iconify-icon icon="lucide:log-out" width="20"></iconify-icon>
          <span class="sidebar-text ${textVisibility}">Sair</span>
        </button>
      </div>
    </aside>

    <div id="sidebarOverlay" class="fixed inset-0 bg-black/40 z-40 hidden md:hidden"></div>
  `;

    const toggleDesktopBtn = document.getElementById("toggleDesktopSidebar");
    const sidebarMenu = document.getElementById("sidebarMenu");
    const toggleIcon = document.getElementById("toggleIcon");
    const sidebarTexts = document.querySelectorAll(".sidebar-text");
    const userCard = document.getElementById("userCard");
    const mainContainer = document.querySelector(".md\\:ml-72") || document.querySelector(".md\\:ml-\\[84px\\]");

    if (mainContainer && isCollapsed) mainContainer.classList.replace("md:ml-72", "md:ml-[84px]");

    function toggleRetractable() {
        const willCollapse = sidebarMenu.classList.contains("md:w-72");
        if (willCollapse) {
            sidebarMenu.classList.replace("md:w-72", "md:w-[84px]");
            sidebarTexts.forEach(el => el.classList.add("md:hidden"));
            toggleIcon.setAttribute("icon", "lucide:chevron-right");
            userCard.classList.add("md:bg-transparent", "md:p-0", "md:border-transparent", "md:shadow-none", "md:justify-center");
            if (mainContainer) mainContainer.classList.replace("md:ml-72", "md:ml-[84px]");
            localStorage.setItem('sidebarCollapsed', 'true');
        } else {
            sidebarMenu.classList.replace("md:w-[84px]", "md:w-72");
            sidebarTexts.forEach(el => el.classList.remove("md:hidden"));
            toggleIcon.setAttribute("icon", "lucide:chevron-left");
            userCard.classList.remove("md:bg-transparent", "md:p-0", "md:border-transparent", "md:shadow-none", "md:justify-center");
            if (mainContainer) mainContainer.classList.replace("md:ml-[84px]", "md:ml-72");
            localStorage.setItem('sidebarCollapsed', 'false');
        }
    }

    if (toggleDesktopBtn) toggleDesktopBtn.addEventListener("click", toggleRetractable);

    const openBtn = document.getElementById("openSidebar");
    const overlay = document.getElementById("sidebarOverlay");
    if (openBtn) openBtn.onclick = () => { sidebarMenu.classList.remove("-translate-x-full"); overlay.classList.remove("hidden"); };
    if (overlay) overlay.onclick = () => { sidebarMenu.classList.add("-translate-x-full"); overlay.classList.add("hidden"); };

    window.logout = function () {
        localStorage.removeItem("token");
        localStorage.removeItem("user_data");
        window.location.href = "/";
    };
});