const jwt = require("jsonwebtoken");

exports.requireAuth = (req, res, next) => {
    try {
        const auth = req.headers.authorization || "";
        const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

        if (!token) {
            return res.status(401).json({ erro: "Não autorizado (token ausente)" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ erro: "Não autorizado (token inválido)" });
    }
};