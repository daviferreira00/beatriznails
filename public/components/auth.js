(function () {
    const token = localStorage.getItem("token");

    if (!token) {
        window.location.href = "/";
        return;
    }

    const originalFetch = window.fetch;
    window.fetch = function (input, init = {}) {
        const url = typeof input === "string" ? input : (input && input.url) || "";
        if (url.startsWith("/api/")) {
            init.headers = init.headers || {};
            if (init.headers instanceof Headers) {
                init.headers.set("Authorization", `Bearer ${token}`);
            } else {
                init.headers["Authorization"] = `Bearer ${token}`;
            }
        }
        return originalFetch(input, init);
    };

    // ✅ define logout aqui (e não no sidebar)
    window.logout = function () {
        localStorage.removeItem("token");
        window.location.href = "/";
    };
})();