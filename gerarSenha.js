const bcrypt = require("bcryptjs");
// Rode no terminal: node gerarSenha.js
async function gerar() {
    const hash = await bcrypt.hash("123456", 10);
    console.log("Copie este hash e cole no banco de dados:");
    console.log(hash);
}
gerar();