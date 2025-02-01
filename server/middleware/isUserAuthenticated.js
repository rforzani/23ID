import jwt from "jsonwebtoken";

const verifyToken = (token) => {
    var result = jwt.verify(token, process.env.JWT_KEY);
    return result;
};

export const isUserAuthenticated = async (req, res, next) => {
    try {
        if (req.cookies && req.cookies["23id_token"]) {
            let payload = verifyToken(req.cookies["23id_token"]);
            if (payload && payload.user) {
                req.user = payload.user;
                next();
            } else {
                res.status(401).send("Unauthorized");
            }
        } else {
            res.status(401).send("Unauthorized");
        }
    } catch (error) {
        console.error(error);
        res.status(401).send("Unauthorized");
    }
};