import jwt from "jsonwebtoken";
import 'dotenv/config'
import { Request, Response, NextFunction } from "express";

export interface RequestJwt extends Request {
    jwt?: any; 
  }


export const jwtVerifyMiddleware = (req: RequestJwt, res: Response, next: NextFunction) => {
    const token = (req.headers.authorization as string)?.replace(/Bearer\s?/, "") || "";

    if (!token) {
        res.status(401).json({ success: false, message: "Необходима авторизация" });
        return;
    }
    try {
        req.jwt = jwt.verify(token, process.env.TOKEN_SECRET_KEY as string);;
        next();
    } catch (error) {
        res.status(403).json({ success: false, message: "Необходима обновление токена" });
        return;
    }
};