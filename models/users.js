const mongoose = require("mongoose");
const Course = require("./courses.js");
const passportLocalMongoose = require("passport-local-mongoose");
const {Schema , model} = mongoose;

const userSchema = new Schema({
    name: String,
    age: Number,
    coursesTaken: [{
        course: {
            type: Schema.Types.ObjectId,
            ref: "Course"
        },
        scoredMarks: Number
    }],
    coursesOffered: [{
        type: Schema.Types.ObjectId,
        ref: "Course"
    }],
    occupation: String
});

userSchema.plugin(passportLocalMongoose);

module.exports.User = model("User" , userSchema);