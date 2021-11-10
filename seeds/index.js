const mongoose = require("mongoose");
const {Course} = require("../models/courses.js");
const {Quiz} = require("../models/quiz.js");
const {Student} = require("../models/student.js");
const {Teacher} = require("../models/teachers.js");

mongoose.connect((process.env.DB_URL || 'mongodb://localhost:27017/quiz-application'), {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
    console.log("DATABASE CONNECTED");
});

async function clearAll() {
    await Course.deleteMany({});
    await Quiz.deleteMany({});
    await Student.deleteMany({});
    await Teacher.deleteMany({});
};

async function seeding() {
    await clearAll();
    await Student.insertMany([
        {name: "Shivansh Sharme" , age: 19},
        {name: "Amit Kumar Sharme" , age: 18},
        {name: "Shivansh Singh" , age: 21},
        {name: "Anit Chadalia" , age: 21},
        {name: "Kapil Kumara" , age: 20}
    ]);
    await Teacher.insertMany([
        {name: "Sandesh Singh" , age: 50},
        {name: "Bhavesh Singh Bansal" , age: 34},
        {name: "Sandesh Kumar Sharma" , age: 65}
    ]);
}

seeding()
.then(() => {
    console.log("[INFO] Seeding Completed!");
    mongoose.connection.close();
})