const express = require('express');

const app = express();
app.set("view engine", "pug");

app.use(express.static('public'));

app.get('/', (req, res) => {
    res.render('index');
});

app.get('/signup', (req, res) => {
    res.render('signup');
})

app.post('/signup', (req, res) => {
    // тут обработка формы
});

app.get('/profile', (req, res) => {
    res.render('profile');
});

app.post('/profile', (req, res) => {
    // тут обработчик формы
})

app.listen(3000, () => {
    console.log("Server started at http://localhost:3000");
});
