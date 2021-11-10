const mongoose = require("mongoose");
const Quiz = require("./quiz.js");
const User = require("./users.js");
const {Schema , model} = mongoose;

const courseSchema = new Schema({
    name: String,
    code: String,
    author: {
        type : Schema.Types.ObjectId,
        ref : "User"
    },
    passingScore: Number,
    quiz: {
        type: Schema.Types.ObjectId,
        ref: "Quiz"
    }
});

module.exports.Course = model("Course" , courseSchema);