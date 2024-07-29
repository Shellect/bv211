const express = require('express');
const bcrypt = require("bcryptjs");
const session = require("express-session");
const redis = require("redis");
const RedisStore = require("connect-redis").default;
const {MongoClient, ObjectId} = require("mongodb");
const {z, ZodError} = require("zod");

const dbClient = new MongoClient(process.env.MONGODB_URI);
const redisClient = redis.createClient({url: process.env.REDIS_URI});

const User = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    repeat_pass: z.string()
})
    .strict()
    .refine(data => data.password === data.repeat_pass, {
        message: "Passwords don't match",
        path: ["password"]
    })
    .refine(async data => {
        const cntUsers = await dbClient.db(process.env.MONGODB_NAME)
            .collection('users')
            .countDocuments({email: data.email});
        return !cntUsers;
    }, {
        message: "User already exists",
        path: ["email"]
    });

const app = express();
app.set("view engine", "pug");
app.use(session({
    store: new RedisStore({client: redisClient}),
    secret: process.env.AUTH_SECRET,
    resave: false,
    saveUninitialized: false
}));
app.use((req, res, next) => {
    res.locals.user = req.session.user;
    next();
})

app.get('/', (req, res) => res.render('index'));

app.get('/signup', (req, res) => {
    if (req.session.user) {
        return res.redirect('/profile');
    } else {
        res.render('signup');
    }
})

app.post('/signup', express.urlencoded({extended: true}), async (req, res) => {
    try {
        const {email, password} = await User.parseAsync(req.body);
        const hashedPassword = await bcrypt.hash(password, 10)
        const user = await dbClient
            .db(process.env.MONGODB_NAME)
            .collection('users')
            .insertOne({
                "email": email,
                "password": hashedPassword,
                "username": "",
                "lastname": "",
                "birthdate": "",
                "gender": "m",
                "phone": ""
            });

        req.session.regenerate(err => {
            if (err) throw err;
            req.session.user = {email, id: user.insertedId.toString()};
            req.session.save(err => {
                if (err) throw err;
                res.redirect("/");
            });
        });
    } catch (e) {
        if (e instanceof ZodError) {
            return res.render("signup", {errors: e.flatten().fieldErrors});
        }
        throw e;
    }
});

app.get('/logout', (req, res) => {
    req.session.user = null;
    req.session.save(function (err) {
        if (err) throw err;
        req.session.regenerate(function (err) {
            if (err) throw err;
            res.redirect('/');
        })
    })
});

app.get('/login', (req, res) => {
    if (req.session.user) {
        return res.redirect('/profile');
    } else {
        res.render('login')
    }
})

app.post('/login', express.urlencoded({extended: true}), async (req, res) => {
    const {email, password} = req.body;
    const user = await dbClient
        .db(process.env.MONGODB_NAME)
        .collection('users')
        .findOne({email});
    if (!user) return res.render('login', {'error': "Неверное имя пользователя или пароль"});
    if (bcrypt.compare(user.password, password)) {
        req.session.regenerate(err => {
            if (err) throw err;
            req.session.user = {email, id: user._id.toString()};
            req.session.save(err => {
                if (err) throw err;
                res.redirect("/");
            });
        });
    } else {
        res.render('login', {'error': "Неверное имя пользователя или пароль"})
    }
});

app.get('/profile', async (req, res) => {
    if (req.session.user) {
        const user = await dbClient.db(process.env.MONGO_NAME)
            .collection('users')
            .findOne({_id: new ObjectId(req.session.user.id)})
        res.render('profile', {user});
    } else {
        res.redirect('/signup');
    }
});

app.post('/profile', express.urlencoded({extended: true}), async (req, res) => {
    await dbClient.db(process.env.MONGO_NAME)
        .collection('users')
        .updateOne({_id: new ObjectId(req.session.user.id)}, {
            $set: req.body
        });
    res.redirect('/')
})

dbClient.connect()
    .then(client => client.db(process.env.MONGODB_NAME).command({ping: 1}))
    .then(doc => {
        console.info("MongoDB connected successfully. Pong from server:");
        console.info(doc);
        return redisClient.connect();
    })
    .then(() => redisClient.ping())
    .then(response => {
        console.log("Redis connected successfully. " + response + " received")
        app.listen(3000, () => console.log("Express server started at http://localhost:3000"))
    })
    .catch(console.error);

async function cleanup() {
    await dbClient.close();
    console.info("MongoDB connection closed!");
    await redisClient.quit();
    console.info("Redis connection closed!");
    process.exit();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
