if (process.env.NODE_ENV !== 'production') {
    require("dotenv").config();
}

const express = require("express");
const mongoose = require("mongoose");
const ejsMate = require("ejs-mate");
const path = require("path");
const methodOverride = require("method-override");
const session = require("express-session");
const flash = require("connect-flash");
const passport = require("passport");
const helmet = require('helmet');
const MongoStore = require('connect-mongo');
const {User} = require("./models/users.js");
const {Course} = require("./models/courses.js");
const {Quiz} = require("./models/quiz.js");
const catchAsync = require("./utils/catchAsync.js");
const ExpressError = require("./utils/ExpressError.js");

mongoose.connect((process.env.DB_URL || 'mongodb://localhost:27017/quiz-application'), {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
    console.log("DATABASE CONNECTED");
});

const app = express();

mongoose.set('useFindAndModify', false);

app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname , "/public")));

const DBoptions = {
    mongoUrl : (process.env.DB_URL || 'mongodb://localhost:27017/quiz-application'),
    touchAfter: 24 * 3600,
    secret: process.env.SECRET,
};

app.use(session({
    secret: process.env.SECRET || 'thisshouldbeasecretlmao',
    store: MongoStore.create(DBoptions),
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
}));

app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
app.use(
    helmet({
      contentSecurityPolicy: false,
    })
);

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
passport.use(User.createStrategy());

app.use((req , res , next) => {
    res.locals.mode = process.env.NODE_ENV;
    res.locals.path = req.path;
    res.locals.user = req.user;
    res.locals.success = req.flash("success");
    res.locals.fail = req.flash("fail");
    next();
});

app.get("/internalAPI/:cid" , catchAsync(async (req , res) => {
    const {cid} = req.params;
    const course = await Course.findById(cid).populate("quiz");
    const opsTemp = ["" , "A" , "B" , "C" , "D"];
    const data = [];
    for (let i = 0 ; i < course.quiz.questions.length ; i++) {
        console.log(i , "*******************");
        data.push({questionId: i+1 , question: course.quiz.questions[i].qn , 
        optionA: course.quiz.questions[i].ans[0] , optionB: course.quiz.questions[i].ans[1],
        optionC: course.quiz.questions[i].ans[2] , optionD: course.quiz.questions[i].ans[3],
        correctOption: opsTemp[course.quiz.questions[i].correctAns[i]]});
    }
    res.json(data);
}));


app.get("/" , (req , res) => {
    res.render("home");
});

app.get("/register" , (req , res) => {
    res.render("users/register");
});

app.post("/register" , catchAsync(async (req , res) => {
    const {name , username , password , age , occupation} = req.body;
    try{
        if (occupation === "teacher"){
            const teacher = new User({name , username , age , occupation});
            const newteacher = await User.register(teacher , password);
            await req.login(newteacher , function(err) {
                if (err) return next(err);
                else {
                    req.flash("success" , "Welcome to Quizzer!");
                    res.redirect("/");
                }
            })
        } else if (occupation === "student"){
            const student = new User({name , username , age , occupation});
            const newStudent = await User.register(student , password);
            await req.login(newStudent , function(err) {
                if (err) return next(err);
                else {
                    req.flash("success" , "Welcome to Quizzer!");
                    res.redirect("/");
                }
            })
        }
    } catch (err) {
        req.flash('fail' , err.message);
        res.redirect("/register");
    }
}));

app.get("/login" , (req , res) => {
    res.render("users/login.ejs");
});

const loginRedirect = function (req , res , next) {
    const redirect = req.session.redirect || "/";
    delete req.session.redirect;
    return res.redirect(redirect);
};

app.post("/login" , passport.authenticate("local" , {failureFlash : true , successFlash : "Welcome Back!" , failureRedirect : "/login"}) , loginRedirect);

app.get("/logout" , (req,  res) => {
    req.logout();
    req.flash("success" , "Bye! Hope to see you back again soon!");
    res.redirect("/");
});

const isLoggedIn = function (req , res , next) {
    if (req.isAuthenticated()) next();
    else {
        req.session.redirect = req.originalUrl;
        req.flash("fail" , "You need to login first");
        res.redirect("/login");
    }
};

const isTeacher = function (req , res , next) {
    if (req.user && req.user.occupation === 'teacher') next();
    else {
        req.flash("fail" , "You need to be a teacher to make a course");
        res.redirect("/");
    }
};

const isStudent = function (req , res , next) {
    if (req.user && req.user.occupation === 'student') next();
    else {
        req.flash("fail" , "You need to be a student to regsiter for a course");
        res.redirect("/");
    }
};

const isAuthor = function (req , res , next) {
    const {cid} = req.params;
    for (let course of req.user.coursesOffered) {
        if (course.equals(cid)) return next();
    }
    req.flash("fail" , "You need to be the creator of the course to edit it");
    res.redirect("/profile");
};

const isTestTaker = function (req , res , next) {
    const {sid} = req.params;
    if (req.user._id.equals(sid)) next();
    else {
        req.flash("fail" , "You can take only your tests");
        res.redirect("/profile");
    }
};

app.get("/course" , isLoggedIn , isTeacher , (req , res) => {
    res.render("course/newCourse");
});

app.post("/course" , isLoggedIn , isTeacher , catchAsync(async (req , res , next) => {
    const {name , code , passingScore} = req.body;
    const newCourse = new Course({name , code , passingScore});
    const {_id} = req.user;
    const author = await User.findById(_id);
    newCourse.author = author;
    author.coursesOffered.push(newCourse);
    await newCourse.save();
    await author.save();
    return res.redirect("/");
}));

app.get("/profile" , isLoggedIn , catchAsync(async (req , res) => {
    const {_id} = req.user;
    const user = await User.findById(_id).populate({
        path: "coursesOffered",
        populate: {
            path: "Course"
        }
    }).populate({
        path: "coursesTaken",
        populate: {
            path: "course",
            populate: {
                path: "Course"
            }
        }
    });
    console.log(user);
    res.render("users/profile" , {user});
}));

app.get("/enroll" , isLoggedIn , isStudent , catchAsync(async (req , res) => {
    let courses = await Course.find({}).populate("author");
    courses = courses.filter(course => {
        let check = true;
        const id = course._id;
        for (let i = 0 ; i < req.user.coursesTaken.length ; i++){
            if (req.user.coursesTaken[i].course._id.equals(id)) check = false;
        }
        return check;
    })
    res.render("users/enroll" , {courses});
}));

app.post("/enroll" , isLoggedIn , isStudent , catchAsync(async (req, res) => {
    const {courseSelected} = req.body;
    const student = await User.findById(req.user._id);
    for (let course of courseSelected) {
        student.coursesTaken.push({course , scoredMarks: -1});
    }
    await student.save();
    res.redirect("/profile");
}));

app.get("/course/:cid" , isLoggedIn , catchAsync(async (req , res) => {
    const {cid} = req.params;
    const course = await Course.findById(cid).populate("quiz");
    console.log(course);
    res.render("course/showCourse" , {course});    
}));

app.delete("/course/:cid" , isLoggedIn , isTeacher , isAuthor , catchAsync(async (req , res) => {
    const {cid} = req.params;
    await Course.findByIdAndDelete(cid);
    const author = await User.findById(req.user._id);
    let tempArr = author.coursesOffered;
    tempArr = tempArr.filter(id => {
        return (!id.equals(cid));
    });
    author.coursesOffered = tempArr;
    await author.save();
    res.redirect("/profile");
}));

app.get("/course/:cid/edit" , isLoggedIn , isTeacher , isAuthor , catchAsync(async (req , res) => {
    const {cid} = req.params;
    const course = await Course.findById(cid);
    res.render("course/courseEdit" , {course});
}));

app.put("/course/:cid" , isLoggedIn , isTeacher , isAuthor , catchAsync(async (req , res) => {
    const {cid} = req.params;
    const {name , code , passingScore} = req.body;
    const course = await Course.findById(cid);
    course.name = name;
    course.code = code;
    course.passingScore = passingScore;
    await course.save();
    res.redirect(`/course/${cid}`);
}));

app.get("/course/:cid/quiz/new" , isLoggedIn , isTeacher , isAuthor , catchAsync(async (req , res) => {
    const {cid} = req.params;
    const course = await Course.findById(cid);
    res.render("quiz/createQuiz" , {course})
}));

app.post("/course/:cid/quiz" , isLoggedIn , isTeacher , isAuthor , catchAsync(async (req , res) => {
    const {cid} = req.params;
    const course = await Course.findById(cid).populate("quiz");
    const {topic , qn , op , correct , time} = req.body;
    if (course.quiz) {
        await Quiz.findByIdAndDelete(course.quiz._id);
        course.quiz = null;
        await course.save();
    }
    const quiz = new Quiz();
    let topicCounter = 0, qnCounter=0;
    
    for (let i = 0 ; i < topic.length ; i++) {
        if (topic[i] !== "") topicCounter++;
    }

    for (let i = 0 ; i < qn.length ; i++) {
        if (qn[i] !== "") qnCounter++;
    }

    for (let i = 0 ; i < topicCounter ; i++) quiz.topics.push(topic[i]);
    for (let i = 0 ; i < qnCounter ; i++) quiz.questions.push({qn: qn[i] , ans: op[i] , correctAns: correct});
    quiz.duration = time;
    quiz.name = course.name;
    quiz.course = course;
    await quiz.save();

    const samequiz = await Quiz.findById(quiz._id);
    samequiz.course = course._id;
    await samequiz.save();

    const samecourse = await Course.findById(cid);
    samecourse.quiz = quiz._id;
    await samecourse.save();

    res.redirect("/profile");
}));

app.get("/course/:cid/quiz/edit" , isLoggedIn , isTeacher , isAuthor , catchAsync(async (req , res) => {
    const {cid} = req.params;
    const course = await Course.findById(cid).populate("quiz");
    res.render("quiz/editQuiz" , {course});
}));

app.get("/course/:cid/quiz/:sid" , isLoggedIn , isStudent , isTestTaker , catchAsync(async (req , res) => {
    const {cid , sid} = req.params;
    const course = await Course.findById(cid).populate("quiz");
    const student = await User.findById(sid);
    res.render("users/quiz/index" , {course , student});
}));

app.post("/course/:cid/quiz/:sid" , isLoggedIn , isStudent , isTestTaker , catchAsync(async (req , res) => {
    const {cid , sid} = req.params;
    const student = await User.findById(sid);
    let i = 0;
    for (i = 0 ; i < student.coursesTaken.length ; i++) {
        if (student.coursesTaken[i].course.equals(cid)) break;
    }
    student.coursesTaken[i].scoredMarks = req.body.score;
    await student.save();
    res.redirect("/profile");
}));

app.all('*', (req, res, next) => {
    next(new ExpressError('Page Not Found', 404))
});

app.use((err, req, res, next) => {
    const { statusCode = 500 } = err;
    if (!err.message) err.message = 'Oh No, Something Went Wrong!'
    res.status(statusCode).render('error', { err })
});

const PORT = process.env.PORT || 3000;
app.listen(PORT , () => {
    console.log(`QUIZ APPLICATION IS NOW RUNNING ON PORT ${PORT}`);
});