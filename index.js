require('dotenv').config()
const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const router = express.Router()
app.use(cors())
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());
app.use('/api', router)
const mySecret = process.env['MONGO_URI']

//connect to db
mongoose.connect(mySecret);
const database = mongoose.connection

//test connection if it is an errror
database.on('error', (error) => {
  console.log(error)
})


//check with this event listener if the process happened once
database.once('connected', () => {
  console.log('Database Connected');
})

//create the model of the user
const userSchema = new mongoose.Schema({
  username: {
    required: true,
    type: String
  }
})
let USER = mongoose.model('USER', userSchema);

// //create the model of the excercise
const exerciseSchema = new mongoose.Schema({
  userId: {
    required: true,
    type: String
  },
  username: {
    required: true,
    type: String
  },
  description: {
    required: true,
    type: String
  },
  duration: {
    required: true,
    type: Number
  },
  date: {
    type: Date
  }
})

let EXERCISE = mongoose.model('EXERCISE', exerciseSchema);


app.use(express.static('public'))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

//Post Method that saves username and id of user
router.post("/users", async (req, res) => {
  const addedUser = new USER({
    username: req.body.username,
  })

  try {
    const dataToSave = await addedUser.save();
    res.json({ "username": dataToSave.username, "_id": dataToSave._id })
    console.log("saved")
  }
  catch (error) {
    res.status(400).json({ message: error.message })
  }
})

//post method that saves exercises
router.post('/users/:_id/exercises', async (req, res) => {

  let afterSavingExercise = (secondErr, exercise) => {
    if (secondErr) {

      res.json({ "error": err.message })
    }
    if (exercise.date !== null) {

      let convertedDate = new Date(exercise.date).toDateString('en-us', { weekday: "long", year: "numeric", month: "short", day: "numeric" })

      res.json({ "username": exercise.username, "description": exercise.description, "duration": exercise.duration, "date": convertedDate, "_id": exercise.userId });
    } else {

      let dateNow = new Date().toDateString('en-us', { weekday: "long", year: "numeric", month: "short", day: "numeric" })


      res.json({ "username": exercise.username, "description": exercise.description, "duration": exercise.duration, "date": dateNow, "_id": exercise.userId });
    }

  }

  let retrievedUser = (err, user) => {
    if (err) {
      res.json({ "error": err.message })
    }
    if (req.body.date == undefined)
      req.body.date = new Date()
    const addedExercise = new EXERCISE({
      userId: req.params._id,
      username: user.username,
      description: req.body.description,
      duration: req.body.duration,
      date: req.body.date,
    })
    addedExercise.save(afterSavingExercise)
  }

  USER.findById({ _id: req.params._id }, retrievedUser)
})


//Get all Method
router.get('/users', async (req, res) => {

  try {
    const allUsers = await USER.find()
    res.json(allUsers)
  }
  catch (error) {
    res.status(500).json({ message: error.message })
  }
})

//Get by ID Method
app.get('/api/users/:_id/logs', (req, res) => {
  const userId = req.params._id;
  const from = req.query.from;
  const to = req.query.to;
  const limit = req.query.limit;
  console.log("s")
  console.log(userId)
  console.log(from)
  console.log(to)
  console.log(limit)
  console.log("e")

  // Find the user with the given id
  USER.findById(userId, (err, user) => {
    console.log("3 thing")
    if (err) {
      res.json({ "error": err });
    } else if (!user) {
      res.json({ "error": "User not found" });
    } else {
      console.log("4 thing")

      // Find the exercises for the user, filtered by the "from" and "to" dates
      let query = EXERCISE.find({ userId: userId }, { description: 1, duration: 1, date: 1, _id: 0 });
      if (from != null && to != null) {
        query = query.where('date').gte(from).lte(to);
      } else if (from != undefined && to == undefined) {
        query = query.where('date').gte(from);
      } else if (to != undefined && from == undefined) {
        query = query.where('date').lte(to);
      }

      // Limit them
      if (limit != null) {
        query = query.limit(limit);

      }

      query.exec((err, exercises) => {
        //convert the date of each property of the excercises array
        let convertedDateExc = exercises.map(exc => {
          exc = exc.toObject()
          return { ...exc, date: new Date(exc.date).toDateString('en-us', { weekday: "long", year: "numeric", month: "short", day: "numeric" }) }
        })

        if (err) {
          res.json({ "error": err });
          return;
        } else {
          let result = {
            _id: user._id,
            username: user.username,
          }

          if (from !== undefined)
            result.from = new Date(from).toDateString()

          if (to !== undefined)
            result.to = new Date(to).toDateString()

          result.count = exercises.length
          result.log = convertedDateExc
          res.json(result);
          console.log(result)
        }
      });
    }
  }
  );
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
});

