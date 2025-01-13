
import jwt from "jsonwebtoken";
import 'dotenv/config'
import bcrypt from "bcrypt";

export const generateAccessToken = (payload: { id: number; email: string }) => 
    jwt.sign(payload, process.env.TOKEN_SECRET_KEY as string, { expiresIn: '15m' });

export const generateRefreshToken = (payload: { id: number; email: string }) =>
    jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET_KEY as string, { expiresIn: '12h' });



export const generateTokemsAndHashRefreshToken = async (payload: { id: number; email: string }) => {
        const token = utils.generateAccessToken(payload);
        const refresh_token = utils.generateRefreshToken(payload);
        const hashedRefreshToken = await bcrypt.hash(refresh_token, 10);
        return { token, refresh_token, hashedRefreshToken };
}


const utils = {
    generateAccessToken,
    generateRefreshToken,
    generateTokemsAndHashRefreshToken
}

export default utils