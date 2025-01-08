
import jwt from "jsonwebtoken";
import 'dotenv/config'
const generateAccessToken = (payload: { id: number; email: string }) => 
    jwt.sign(payload, process.env.TOKEN_SECRET_KEY as string, { expiresIn: '1h' });

const generateRefreshToken = (payload: { id: number; email: string }) =>
    jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET_KEY as string, { expiresIn: '30d' });


const utils = {
    generateAccessToken,
    generateRefreshToken
}

export default utils