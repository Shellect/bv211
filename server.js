const express = require('express');
const bcrypt = require("bcryptjs");
const session = require("express-session");
const {MongoClient, ObjectId} = require("mongodb");
const {z, ZodError} = require("zod");

const client = new MongoClient(process.env.MONGODB_URI);

const User = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    repeat_pass: z.string()
}).strict().refine(data => data.password === data.repeat_pass, {
    message: "Passwords don't match",
    path: ["password"]
}).refine(async data => {
    const cntUsers = await client.db(process.env.MONGODB_NAME)
        .collection('users')
        .countDocuments({email: data.email});
    return !cntUsers;
}, {
    message: "User already exists",
    path: ["email"]
});

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

app.get('/profile', isAuthenticated, (req, res) => {
    res.render('profile');
})

app.get('/signup', (req, res) => {
    res.render('signup', {errors: {}});
})

app.post('/signup', async (req, res) => {
    try {
        const {email, password} = await User.parseAsync(req.body);
        const hashedPassword = await bcrypt.hash(password, 10)
        const user = await client
            .db(process.env.MONGODB_NAME)
            .collection('users')
            .insertOne({email, password: hashedPassword});

        console.log(user);

        req.session.regenerate(err => {
            if (err) throw err;
            req.session.user = {email, id: user.insertedId.toString()}
            req.session.save(err => {
                if (err) throw err;
                res.redirect("/profile");
            })
        })
    } catch (e) {
        if (e instanceof ZodError) {
            return res.render("signup", {errors: e.flatten().fieldErrors});
        }
        throw e;
    }
});

app.get('/signin', async (req, res) => {
    const {email, password} = req.body;
    const existingUser = await app.locals.db.collection('users').findOne({email});
    if (bcrypt.compare(existingUser.password, password)) {

    }
});

app.get('/profile', (req, res) => {
    res.render('profile');
});

app.post('/profile', (req, res) => {
    // тут обработчик формы
})

client.connect()
    .then(client => {
        console.info("MongoDB connected");
        app.listen(3000, () => {
            console.log("Server started at http://localhost:3000");
        });
    })
    .catch(console.error);

const cleanup = async event => {
    console.info("Connection closed!");
    await client.close();
    process.exit();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
