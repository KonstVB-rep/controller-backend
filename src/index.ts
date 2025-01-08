import express from 'express';
import authRouter from './routes/authRoutes';

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()


const expressApp = express();

expressApp.use(express.json());

const ideas = [
    { id: 1, title: 'Title 1' },
    { id: 2, title: 'Title 2' },
    { id: 3, title: 'Title 3' }
]

const users = [
    { id: 1, name: 'User 1' },
    { id: 2, name: 'User 2' },
    { id: 3, name: 'User 3' }
]

expressApp.get('/ping', (req, res) => {
    res.json('Pong!');
});

expressApp.get('/ideas', (req, res) => {
    res.send(ideas);
});

expressApp.get('/users', (req, res) => {
    // prisma.users
    //     .findMany()
    //     .then((users) => {
    //         res.send(users);
    //     })
    //     .catch((error) => {
    //         console.error(error);
    //     });
    res.json(users);
});

expressApp.use("/auth", authRouter);


expressApp.listen(4000, () => {
    console.info('Listening on port http://localhost:4000');
});