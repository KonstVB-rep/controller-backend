import express from 'express';
import authRouter from './routes/authRoutes';

import { jwtVerifyMiddleware } from './middlewares/jwtVerifyMiddleware';

const expressApp = express();

expressApp.use(express.json());


const users = [
    { id: 1, name: 'User 1' },
    { id: 2, name: 'User 2' },
    { id: 3, name: 'User 3' }
]

expressApp.get('/users',jwtVerifyMiddleware, (req, res) => {
    res.json(users);
});

expressApp.use("/auth", authRouter);

expressApp.listen(4000, () => {
    console.info('Listening on port http://localhost:4000');
});