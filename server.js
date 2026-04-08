const express = require("express");
const path = require("path");
const cors = require("cors");
const jwt = require("jsonwebtoken");

require("dotenv").config();

const clientesRoutes = require("./src/routes/clientes.routes");
const servicosRoutes = require("./src/routes/servicos.routes");
const agendamentosRoutes = require("./src/routes/agendamentos.routes");
const financeiroRoutes = require("./src/routes/financeiro.routes");
const bloqueiosRoutes = require("./src/routes/bloqueios.routes");

const app = express();
const PORT = process.env.PORT || 3001;

/**
 * DEBUG: Identidade do processo/arquivo
 */
console.log("==========================================");
console.log("✅ SERVER INICIADO (DEBUG)");
console.log("📌 Arquivo:", __filename);
console.log("📌 Pasta :", __dirname);
console.log("📌 PID   :", process.pid);
console.log("📌 Porta :", PORT);
console.log("📌 NODE  :", process.version);
console.log("📌 Data  :", new Date().toISOString());
console.log("==========================================");

/**
 * DEBUG: Variáveis do .env (não imprime senhas completas)
 */
console.log("🔐 ENV CHECK:");
console.log("  ADMIN_EMAIL set?   ->", Boolean(process.env.ADMIN_EMAIL));
console.log("  ADMIN_PASSWORD set?->", Boolean(process.env.ADMIN_PASSWORD));
console.log("  JWT_SECRET set?    ->", Boolean(process.env.JWT_SECRET));
console.log("  JWT_SECRET length  ->", (process.env.JWT_SECRET || "").length);
console.log("==========================================");

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

/**
 * DEBUG: log de requests básicas (rota, método)
 * (pode comentar depois)
 */
app.use((req, res, next) => {
    console.log(`➡️  [REQ] ${req.method} ${req.url}`);
    next();
});

app.get("/", (req, res) => {
    console.log("🟢 GET / -> enviando login.html");
    return res.sendFile(path.join(__dirname, "public", "login.html"));
});

/**
 * DEBUG: Endpoint extra pra validar que o server atual está no ar
 * Acesse: http://localhost:3001/__debug
 */
app.get("/__debug", (req, res) => {
    return res.json({
        ok: true,
        file: __filename,
        pid: process.pid,
        port: PORT,
        hasEnv: {
            ADMIN_EMAIL: Boolean(process.env.ADMIN_EMAIL),
            ADMIN_PASSWORD: Boolean(process.env.ADMIN_PASSWORD),
            JWT_SECRET: Boolean(process.env.JWT_SECRET)
        },
        time: new Date().toISOString()
    });
});

app.post("/login", (req, res) => {
    console.log("🟣 POST /login (DEBUG) - bateu no login JWT!");
    try {
        const { email, senha } = req.body;

        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPassword = process.env.ADMIN_PASSWORD;
        const jwtSecret = process.env.JWT_SECRET;

        console.log("   ↪ body.email:", email);
        console.log("   ↪ body.senha:", senha ? "***" : "(vazio)");
        console.log("   ↪ env.ADMIN_EMAIL:", adminEmail);
        console.log("   ↪ env.ADMIN_PASSWORD:", adminPassword ? "***" : "(vazio)");
        console.log("   ↪ env.JWT_SECRET:", jwtSecret ? `*** (len=${jwtSecret.length})` : "(vazio)");

        if (!jwtSecret) {
            console.log("❌ JWT_SECRET não configurado");
            return res.status(500).json({ message: "JWT_SECRET não configurado no .env" });
        }
        if (!adminEmail || !adminPassword) {
            console.log("❌ ADMIN_EMAIL/ADMIN_PASSWORD não configurados");
            return res.status(500).json({ message: "ADMIN_EMAIL/ADMIN_PASSWORD não configurados no .env" });
        }

        const ok = (email === adminEmail && senha === adminPassword);
        console.log("   ↪ credenciais OK? ->", ok);

        if (!ok) {
            return res.status(401).json({ message: "E-mail ou senha inválidos" });
        }

        const token = jwt.sign(
            { email, role: "admin" },
            jwtSecret,
            { expiresIn: "12h" }
        );

        console.log("✅ TOKEN GERADO (len):", token.length);

        return res.status(200).json({
            message: "Login realizado com sucesso",
            token
        });
    } catch (err) {
        console.error("🔥 ERRO no /login:", err);
        return res.status(500).json({ message: "Erro ao realizar login" });
    }
});

// Rotas API
app.use("/api/clientes", clientesRoutes);
app.use("/api/servicos", servicosRoutes);
app.use("/api/agendamentos", agendamentosRoutes);
app.use("/api/financeiro", financeiroRoutes);
app.use("/api/bloqueios", bloqueiosRoutes);

/**
 * DEBUG: handler de 404 (quando rota não existe)
 */
app.use((req, res) => {
    console.log("⚠️  404:", req.method, req.url);
    res.status(404).send("Not Found");
});

app.listen(PORT, () => {
    console.log(`✅ Servidor rodando em http://localhost:${PORT}`);
    console.log(`✅ Debug: http://localhost:${PORT}/__debug`);
});