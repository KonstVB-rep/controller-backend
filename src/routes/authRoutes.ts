import express from "express";
import { register, login, logout, refreshTokens,getCurrentUser } from "../controllers/UserControllers";
import { jwtVerifyMiddleware } from "../middlewares/jwtVerifyMiddleware";

const authRouter = express.Router();

authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.post("/logout", logout);
authRouter.post("/refresh-tokens" ,refreshTokens);
authRouter.post("/getCurrentUser", jwtVerifyMiddleware, getCurrentUser);

export default authRouter;