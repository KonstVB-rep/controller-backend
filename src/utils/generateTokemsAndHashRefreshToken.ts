
import utils from ".";
import bcrypt from "bcrypt";

export const generateTokemsAndHashRefreshToken = async (payload: { id: number; email: string }) => {
        const token = utils.generateAccessToken(payload);
        const refresh_token = utils.generateRefreshToken(payload);
        const hashedRefreshToken = await bcrypt.hash(refresh_token, 10);
        return { token, refresh_token, hashedRefreshToken };
}