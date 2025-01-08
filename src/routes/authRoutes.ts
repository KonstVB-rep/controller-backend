import express from "express";
import { register, login, logout, updateTokens,getCurrentUser } from "../controllers/UserControllers";
import { jwtVerifyMiddleware } from "../middlewares/jwtVerifyMiddleware";
import { verifyRefreshTokenMiddleware } from "../middlewares/verifyRefreshTokenMiddleware";

const authRouter = express.Router();

authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.post("/logout", logout);
authRouter.post("/refresh-tokens" ,updateTokens);
authRouter.post("/getCurrentUser", jwtVerifyMiddleware, getCurrentUser);

export default authRouter;