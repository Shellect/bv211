const express = require('express');
const bcrypt = require("bcryptjs");
const session = require("express-session");
const {MongoClient} = require("mongodb");
const {z, ZodError} = require("zod");

const client = new MongoClient(process.env.MONGODB_URI);
const User = z.object({
    email: z.string().email(),
    password: z.string().min(6).transform(async val => await bcrypt.hash(val, 10)),
    repeat_pass: z.string()
}).strict().refine(data => data.password === data.repeat_pass, {
    message: "Passwords don't match",
    path: ["password"]
}).refine(async data => {
    await client.connect();
    const db = client.db(process.env.MONGODB_NAME);
    const users = db.collection('users');
    const cntUsers = await users.countDocuments({email: data.email});
    await client.close();
    return !cntUsers;
}, {
    message: "User already exists",
    path: ["email"]
});

async function insertUser(email, password) {
    const {email, password} = data;
    await client.connect();
    const db = client.db(process.env.MONGODB_NAME);
    const users = db.collection('users');
    const result = await users.insertOne({email, password});
    await client.close();
    return result;
}

async function findUser(email) {
    await client.connect();
    const db = client.db(process.env.MONGODB_NAME);
    const users = db.collection('users');
    const result = await users.findOne({email});
    await client.close();
    return result;
}

const app = express();
app.set("view engine", "pug");
app.use(express.urlencoded({extended: true}));
app.use(session({
    secret: process.env.AUTH_SECRET,
    resave: false,
    saveUninitialized: true
}));

function isAuthenticated(req, res, next) {
    if (req.session.user) next()
    else next('route')
}

app.get('/', (req, res) => {
    res.render('index');
});

app.get('/signup', (req, res) => {
    res.render('signup');
})

app.post('/signup', async (req, res, next) => {
    try {
        const {email, password} = User.parse(req.body);
        await insertUser(email, password);

        // TODO: make authentication
        res.redirect("/profile");
    } catch (e) {
        if (e instanceof ZodError) {
            return res.render("signup", {errors: e.flatten().fieldErrors});
        }
        throw e;
    }
});

app.get('/signin', async (req, res) => {
    const {email, password} = req.body;
    const existingUser = await findUser({email});
    if (bcrypt.compare(existingUser.password, password)) {

    }
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
