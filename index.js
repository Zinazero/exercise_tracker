const express = require('express');  // Importing the Express.js module
const app = express();  // Creating an instance of the Express application
const cors = require('cors');  // Importing the CORS module
require('dotenv').config();  // Loading environment variables from a .env file
const mongoose = require("mongoose");  // Importing the Mongoose module

mongoose.connect(process.env.MONGO_URI);  // Connecting to MongoDB using the provided URI

app.use(cors());  // Allowing Cross-Origin Resource Sharing
app.use(express.static('public'));  // Serving static files from the 'public' directory
app.use(express.urlencoded({ extended: false }));  // Parsing URL-encoded request bodies
app.get('/', (req, res) => {  // Handling the root URL request
  res.sendFile(__dirname + '/views/index.html');  // Sending the index.html file as the response
});

// Defining Mongoose Schemas for the 'Exercise', 'User', and 'Log' collections
const Schema = mongoose.Schema;
const exerciseSchema = new Schema({
  description: String,
  duration: Number,
  date: String,
});
let Exercise = new mongoose.model("Exercise", exerciseSchema);
const userSchema = new Schema({
  username: { type: String, required: true },
  _id: { type: String, required: true }
});
let User = new mongoose.model("User", userSchema);
const logSchema = new Schema({
  username: { type: String, required: true },
  count: Number,
  _id: { type: String, required: true },
  log: [{}]
});
let Log = new mongoose.model("Log", logSchema);

// Handling the POST request to create a new user
app.post("/api/users", function(req, res) {
  const validateId = () => {  // Recursive function to generate a random and unique ID
    username = req.body.username;
    var userId = generateRandomId(9);

    User.findOne({ _id: userId })  // Checking if the generated ID already exists
      .exec()
      .then(user => {
        if (user) {
          validateId();  // If ID exists, recursively call the function again
        } else {
          var newUser = new User({ username: username, _id: userId });  // Creating a new user with the provided username and generated ID
          var newLog = new Log({ username: username, count: 0, _id: userId, log: [] });  // Creating a new log entry for the user
          newLog.save();  // Saving the log entry
          newUser.save()  // Saving the new user
            .then(savedUser => {
              res.json(savedUser);  // Sending the saved user as the response
            })
            .catch(err => {
              console.error(err);
              res.status(500).json({ error: "An error occurred" });  // Handling any error that occurs during user saving
            });
        }
      })
      .catch(err => {
        console.error(err);
        res.status(500).json({ error: "An error occurred" });  // Handling any error that occurs during ID validation
      });
  };
  validateId();  // Initiating the ID validation process
});

// Handling the GET request to retrieve all users
app.get("/api/users", function(req, res) {
  User.find({})  // Retrieving all users from the database
    .exec()
    .then(users => {
      res.json(users);  // Sending the retrieved users as the response
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({ error: "An error occurred" });  // Handling any error that occurs during user retrieval
    });
});

// Handling the POST request to add a new exercise to a user's log
app.post("/api/users/:_id/exercises", async function(req, res) {
  try {
    var userId = req.params._id;
    var user = await User.findOne({ _id: userId }).exec();  // Finding the user with the provided ID
    var description = req.body.description;
    var duration = parseInt(req.body.duration);
    var date = req.body.date;
    if (!req.body.date) {
      var currentDate = new Date();
      date = currentDate.toDateString();
    }  else {
      date = new Date(date).toDateString();
    };
    var newExercise = new Exercise({ description: description, duration: duration, date: date });  // Creating a new exercise object
    var userLog = await Log.findOne({ _id: userId }).exec();  // Finding the log entry for the user
    userLog.log.push(newExercise);  // Adding the new exercise to the user's log
    userLog.save().then(savedLog => { 
      savedLog.count = savedLog.log.length;
      savedLog.save()
    });
    res.json({
      username: user.username,
      description: description,
      duration: duration,
      date: date,
      _id: user._id
    });  // Sending the details of the added exercise as the response
  } catch (error) {
    console.error(error);
  };
});

// Handling the GET request to retrieve a user's exercise log
app.get("/api/users/:id/logs", async function(req, res) {
  try {
    var userId = req.params.id;
    var userLog = await Log.findOne({ _id: userId }).exec();  // Finding the log entry for the user

    var fromDate = req.query.from;
    var toDate = req.query.to;
    var limit = parseInt(req.query.limit);

    if (fromDate && toDate) {
      userLog.log = userLog.log.filter(log => {  // Filtering the log entries based on provided date range
        var logDate = new Date(log.date);
        return logDate >= new Date(fromDate) && logDate <= new Date(toDate);
      });
    }

    if (limit) {
      userLog.log = userLog.log.slice(0, limit);  // Limiting the number of log entries based on provided limit
    }

    res.json(userLog);  // Sending the user's log as the response
  } catch (error) {
    console.error(error);
  }
});

// Function to generate a random ID with the specified number of digits
function generateRandomId(digits) {
  const maxValue = Math.pow(10, digits) - 1;
  let randomId = Math.floor(Math.random() * maxValue);
  return randomId.toString();
}

// Starting the server and listening on the specified port
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
