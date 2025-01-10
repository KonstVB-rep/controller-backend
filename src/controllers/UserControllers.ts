import { Request, Response } from "express";
import bcrypt from "bcrypt";
import "dotenv/config";
import jwt, { JsonWebTokenError } from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import utils from "../utils";

const prisma = new PrismaClient();

export const register = async (req: Request, res: Response) => {
  try {
    const user = await prisma.users.findUnique({
      where: {
        email: req.body.email,
      },
    });

    if (user) {
      res.json({
        success: false,
        message: "Пользователь с таким email уже существует",
      });
      return;
    }
    const password = req.body.password;

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);

    await prisma.users.create({
      data: {
        username: req.body.username,
        email: req.body.email,
        passwordHash: hash,
      },
    });

    const newUser = await prisma.users.findUnique({
      where: {
        email: req.body.email,
      },
    });

    if (!newUser) {
      res.json({
        success: false,
        message: "Ошибка при регистрации",
      });
      return;
    }

    res
      .status(201)
      .json({ message: "Пользователь успешно зарегистрирован", success: true });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Ошибка при регистрации",
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    // Поиск пользователя

    const user = await prisma.users.findUnique({
      where: {
        email: req.body.email,
      },
    });

    if (!user) {
      res.json({
        success: false,
        message: "Неверные учетные данные",
      });
      return;
    }

    // Проверка пароля
    const isValidPassword = await bcrypt.compare(
      req.body.password,
      user.passwordHash
    );

    if (!isValidPassword) {
      res.json({
        success: false,
        message: "Неверные учетные данные",
      });
      return;
    }

    if (user.activeSession) {
      res.json({
        success: false,
        message: "Пользователь c указанным данными уже авторизован",
      });
      return;
    }

    // Генерация токенов и остальные действия
    const { token, refresh_token, hashedRefreshToken } =
      await utils.generateTokemsAndHashRefreshToken({
        id: user.id,
        email: user.email,
      });

    await prisma.$transaction([
      prisma.users.update({
        where: { id: user.id },
        data: { activeSession: true },
      }),
      prisma.refresh_tokens.upsert({
        where: { user_id: user.id },
        update: { refresh_token: hashedRefreshToken },
        create: {
          user_id: user.id,
          refresh_token: hashedRefreshToken,
        },
      }),
    ]);

    const { passwordHash, created_at, updated_at, ...userData } = user;

    res.json({
      success: true,
      user: { ...userData, activeSession: true },
      accessToken: token,
      refreshToken: refresh_token,
    });
  } catch (error) {
    console.log("Ошибка в процессе авторизации:", error);
    res.status(500).json({
      success: false,
      message: "Ошибка при авторизации",
    });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    if (!req.body.email) {
      res.json({
        success: false,
        message: "Пользователь не найден",
      });
      return;
    }
    const user = await prisma.users.findUnique({
      where: {
        email: req.body.email,
      },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: "Пользователь не найден",
      });
      return;
    }

    await prisma.users.update({
      where: { id: user.id },
      data: { activeSession: false },
    });

    res.json({ success: true, message: "Выход успешно выполнен" });
  } catch (error) {
    console.log("Ошибка в процессе выхода:", error);
    res.json({
      success: false,
      message: "Ошибка при выхода",
    });
  }
};

interface RequestWithUserId extends Request {
  userId?: number;
}

export const getCurrentUser = async (req: RequestWithUserId, res: Response) => {
  console.log("getCurrentUser", req.body);
  try {
    const user = await prisma.users.findUnique({
      where: {
        email: req.body.email,
      },
    });

    if (!user) {
      res.json({
        succes: false,
        message: "Пользователь не найден",
      });
      return;
    }

    const { passwordHash, created_at, updated_at, ...userData } = user;

    res.json({
      success: true,
      user: { ...userData },
    });
  } catch (err) {
    console.log(err);
    res.json({
      succes: false,
      message: "Ошибка при получении профиля",
    });
  }
};

export const refreshTokens = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { refreshToken, userId } = req.body;;

  if (!refreshToken) {
    res
      .status(400)
      .json({ success: false, message: "Refresh token is required" });
    return;
  }

  try {
    // Найти refreshToken в базе данных

    const refreshTokenDB = await prisma.refresh_tokens.findFirst({
      where: { user_id: userId },
    });

    if (!refreshTokenDB?.refresh_token) {
      res
        .status(401)
        .json({ success: false, message: "Invalid refresh token" });
      return;
    }

    // Проверить, действителен ли refreshToken

    jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET_KEY!
    ) as jwt.JwtPayload;

    //совпадает ли refreshToken в базе данных с переданным
    const isMatch = await bcrypt.compare(
      refreshToken,
      refreshTokenDB.refresh_token
    );

    console.log(isMatch, "isMatch");

    if (!isMatch) {
      console.log("!isMatch");
      res
        .status(403)
        .json({ success: false, message: "Invalid refresh token" });
      return;
    }

    const token = utils.generateAccessToken({
      id: refreshTokenDB.user_id,
      email: req.body.email,
    });

    res.json({
      success: true,
      accessToken: token,
    });
  } catch (error) {
    console.error("Ошибка обновления токенов:", error);
    if (error instanceof JsonWebTokenError) {
      res
        .status(403)
        .json({ success: false, message: "Пожалуйста, авторизируйтесь" });
      return;
    }

    res
      .status(500)
      .json({ success: false, message: "Ошибка при обновлении токенов" });
  }
};
