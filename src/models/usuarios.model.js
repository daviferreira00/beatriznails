const db = require("../db/connection");

async function buscarPorEmail(email) {
    const query = "SELECT * FROM usuarios WHERE email = ?";
    const [rows] = await db.query(query, [email]);
    return rows[0];
}

async function listarTodos() {
    // Trazemos tudo, exceto a senha
    const query = "SELECT id, nome, email, perfil, criado_em FROM usuarios ORDER BY criado_em DESC";
    const [rows] = await db.query(query);
    return rows;
}

async function criar(nome, email, senhaHash, perfil) {
    const query = "INSERT INTO usuarios (nome, email, senha, perfil) VALUES (?, ?, ?, ?)";
    const [result] = await db.query(query, [nome, email, senhaHash, perfil]);
    return result.insertId;
}

async function deletar(id) {
    const query = "DELETE FROM usuarios WHERE id = ?";
    const [result] = await db.query(query, [id]);
    return result.affectedRows > 0; // Retorna true se deletou
}

module.exports = {
    buscarPorEmail,
    listarTodos,
    criar,
    deletar
};