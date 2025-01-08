import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface RequestWithUser extends Request {
    user?: { id: number; email: string };
  }
  
  export const verifyRefreshTokenMiddleware = async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { refreshToken } = req.body;
  
      if (!refreshToken) {
         res.status(400).json({
          success: false,
          message: "Refresh token is required",
        });
        return
      }
  
      // Проверяем refreshToken с помощью JWT
      const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET_KEY!) as jwt.JwtPayload;
  
      if (!decoded || typeof decoded === "string") {
        res.status(403).json({
          success: false,
          message: "Invalid refresh token",
        });
        return;
      }
  
      // Проверяем refreshToken в базе данных
      const tokenRecord = await prisma.refresh_tokens.findFirst({
        where: { user_id: decoded.id },
      });
  
      if (!tokenRecord) {
         res.status(403).json({
          success: false,
          message: "Invalid refresh token",
        });
        return
      }
  
      // Проверяем, совпадает ли токен с записанным в базе данных
      const isTokenValid = await bcrypt.compare(refreshToken, tokenRecord.refresh_token);
  
      if (!isTokenValid) {
         res.status(403).json({
          success: false,
          message: "Invalid refresh token",
        });
        return;
      }
  
      // Добавляем данные пользователя в `req.user`
      req.user = { id: decoded.id, email: decoded.email };
      next();
    } catch (error) {
      console.error("Error verifying refresh token:", error);
  
      if (error instanceof jwt.TokenExpiredError) {
        res.status(401).json({
          success: false,
          message: "Refresh token expired. Please log in again.",
        });
        return;
      }
  
      res.status(500).json({
        success: false,
        message: "Internal Server Error",
      });
      return;
    }
  };