import { Request, Response } from "express";
import bcrypt from "bcrypt";
import 'dotenv/config'
// import utils from "../utils/index.js";
import jwt from "jsonwebtoken";
import { PrismaClient } from '@prisma/client'
import { generateTokemsAndHashRefreshToken } from "../utils/generateTokemsAndHashRefreshToken.js";

const prisma = new PrismaClient()


// const generateAccessToken = (payload: { id: number; email: string }) =>
//   utils.generateAccessToken(payload);
// const generateRefreshToken = (payload: { id: number; email: string }) =>
//   utils.generateRefreshToken(payload);


export const register = async (req: Request, res: Response) => {

  try {

    const user = await prisma.users.findUnique({
      where: {
        email: req.body.email,
      },
    })

    if (user) {
      res.status(400).json({
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
    })

    if (!newUser) {
      res.status(500).json({
        success: false,
        message: "Ошибка при регистрации", 
      });
      return;
    }

    // const token = generateAccessToken({ id: user.id, email: user.email });

    // const { passwordHash, ...userData } = user;

    res.status(201).json({ message: "Пользователь успешно зарегистрирован", success: true });
  } catch (error) {
    console.log(error);

     res.status(500).json({
      success: false,
      message: 'Ошибка при регистрации',
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
      // Просто вызываем res.json() без return
      res.status(404).json({
        success: false,
        message: "Неверные учетные данные",
      });
      return; // Возвращаем здесь для завершения выполнения функции
    }

    // Проверка пароля
    const isValidPassword = await bcrypt.compare(
      req.body.password,
      user.passwordHash
    );

    if (!isValidPassword) {
      // Просто вызываем res.json() без return
      res.status(400).json({
        success: false,
        message: "Неверные учетные данные",
      });
      return; // Возвращаем здесь для завершения выполнения функции
    }

    if(user.activeSession) {
      res.status(400).json({
        success: false,
        message: "Пользователь c указанным данными уже авторизован",
      });
      return;
    }

    // Генерация токенов и остальные действия
    const  { token, hashedRefreshToken} =await generateTokemsAndHashRefreshToken({ id: user.id, email: user.email });
    // const payload = { id: user.id, email: user.email };
    // const token = generateAccessToken(payload);
    // const refresh_token = generateRefreshToken(payload);
    // const hashedRefreshToken = await bcrypt.hash(refresh_token, 10);

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

    const { passwordHash, ...userData } = user;

    res.json({
      success: true,
      user: userData,
      token,
      refresh_token: hashedRefreshToken,
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

    res.json({ success: true });
  } catch (error) {
    console.log("Ошибка в процессе выхода:", error);
    res.status(500).json({
      success: false,
      message: "Ошибка при выхода",
    });
  }
};

interface RequestWithUserId extends Request {
  userId?: number;
}


export const getCurrentUser = async (req: RequestWithUserId, res: Response) => {
  try {
    const user = await prisma.users.findUnique({
      where: {
        id: req.userId,
      },
    });

    if (!user) {
      res.status(404).json({
        succes: false,
        message: "Пользователь не найден",
      });
      return;
    }

    const { passwordHash, ...userData } = user;

    res.json(userData);
  } catch (err) {
    console.log(err);
    res.status(500).json({
      succes: false,
      message: "Ошибка при получении профиля",
    });
  }
};


export const updateTokens = async (req: Request, res: Response):Promise<void> => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    res.status(400).json({ success: false, message: "Refresh token is required" });
    return;
  }

  try {
    // Найти refreshToken в базе данных

    const refreshTokenDB = await prisma.refresh_tokens.findFirst({
      where: { refresh_token: refreshToken },
    });

    if (!refreshTokenDB) {
      res.status(403).json({ success: false, message: "Invalid refresh token" });
      return;
    }

    // Проверить, действителен ли refreshToken
    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET_KEY!) as jwt.JwtPayload;

    // Генерация нового accessToken и refreshToken
    const  { token, hashedRefreshToken} =await generateTokemsAndHashRefreshToken({ id: refreshTokenDB.user_id, email: req.body.email });
    // const payload = { id: refreshTokenDB.user_id, email: req.body.email };
    // const newAccessToken = generateAccessToken(payload);
    // const newRefreshToken = generateRefreshToken(payload);
    // const hashedNewRefreshToken = await bcrypt.hash(newRefreshToken, 10);

    // Обновить refreshToken в базе данных
    await prisma.refresh_tokens.update({
      where: { user_id: refreshTokenDB.user_id },
      data: { refresh_token: hashedRefreshToken },
    });

    res.json({
      success: true,
      accessToken: token,
      refreshToken: hashedRefreshToken,
    });
  } catch (error) {
    console.error("Error refreshing tokens:", error);
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ success: false, message: "Refresh token expired. Please log in again." });
      return;
    }

    res.status(403).json({ success: false, message: "Invalid or expired refresh token" });
  }
};



// interface RequestWithUser extends Request {
//   user?: { id: number ; email: string };
// }

// //с middleware
// export const updateTokens = async (req: RequestWithUser, res: Response) => {
//   const { refreshToken } = req.body;

//   if (!refreshToken) {
//     res.status(400).json({ success: false, message: "Refresh token is required" });
//     return;
//   }

//   if (!req.user) {
//     res.status(403).json({ success: false, message: "Unauthorized" });
//     return;
//   }

//   const payload = { id: req.user.id, email: req.user.email };
//   const newAccessToken = generateAccessToken(payload);
//   const newRefreshToken = generateRefreshToken(payload);
//   const hashedNewRefreshToken = await bcrypt.hash(newRefreshToken, 10);

//   await prisma.refresh_tokens.update({
//     where: { user_id: req.user.id },
//     data: { refresh_token: hashedNewRefreshToken },
//   });

//   res.json({
//     success: true,
//     accessToken: newAccessToken,
//     refreshToken: newRefreshToken,
//   });
// };