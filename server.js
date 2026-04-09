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
const authRoutes = require("./src/routes/auth.routes");
const usuariosRoutes = require("./src/routes/usuarios.routes");

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

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public"), { extensions: ["html"] }));


app.use((req, res, next) => {
    console.log(`➡️  [REQ] ${req.method} ${req.url}`);
    next();
});

app.get("/__debug", (req, res) => {
    return res.json({
        ok: true,
        file: __filename,
        pid: process.pid,
        port: PORT,
        time: new Date().toISOString()
    });
});

app.get("/health", (req, res) => {
    return res.json({ status: "ok", time: new Date().toISOString() });
})

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "login.html"));
});


// Rotas API
app.use("/api/clientes", clientesRoutes);
app.use("/api/servicos", servicosRoutes);
app.use("/api/agendamentos", agendamentosRoutes);
app.use("/api/financeiro", financeiroRoutes);
app.use("/api/bloqueios", bloqueiosRoutes);
app.use("/api/usuarios", usuariosRoutes);
app.use("/api/auth", authRoutes);



app.use((req, res) => {
    console.log("⚠️  404:", req.method, req.url);
    res.status(404).send("Not Found");
});

app.listen(PORT, () => {
    console.log(`✅ Servidor rodando em http://localhost:${PORT}`);
    console.log(`✅ Debug: http://localhost:${PORT}/__debug`);
});