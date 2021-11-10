const mongoose = require("mongoose");
const Course = require("./courses.js");
const {Schema , model} = mongoose;

const quizSchema = new Schema({
    name: String,
    topics: [String],
    duration: Number,
    questions: [{
        qn: String,
        ans: [String],
        correctAns: [String]
    }],
    course: {
        type: Schema.Types.ObjectId,
        ref: "Course"
    }
});

module.exports.Quiz = model("Quiz" , quizSchema);