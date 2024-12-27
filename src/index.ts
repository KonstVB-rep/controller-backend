import express from 'express';

const expressApp = express();//Создание express приложения

const ideas = [
    { id: 1, title: 'Title 1' },
    { id: 2, title: 'Title 2' },
    { id: 3, title: 'Title 3' }
]

expressApp.get('/ping', (req, res) => {
    res.json('Pong!');
});

expressApp.get('/ideas', (req, res) => {
    res.send(ideas);
});


expressApp.listen(3000, () => {
    console.info('Listening on port http://localhost:3000');
});