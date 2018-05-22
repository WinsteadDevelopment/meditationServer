const Expo = require('expo-server-sdk');
const mongoose = require('mongoose');

require('dotenv').config();

const express = require('express');
const bodyParser = require ('body-parser');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 9000;
const dateFormat = require('dateformat');

const app = express();

const expo = new Expo();


mongoose.connect(`mongodb://admin:${process.env.DBPASSWORD}@ds133776.mlab.com:33776/meditation`);

const Affirmations = mongoose.model('affirmations', { affirmations: Array });
const Adjectives = mongoose.model('adjectives', { adjectives: Array });
const Users = mongoose.model('users', { username: String, password: String, completions: Number, rememberMe: Boolean});
const Todos = mongoose.model('todos', { userId: String, item: String, date: String});
const Journals = mongoose.model('journals', {userId: String, entry: String, date: String});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(passport.initialize());
app.use(passport.session());

const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
var opts = {};
opts.jwtFromRequest = ExtractJwt.fromHeader('authorization'),
opts.secretOrKey = 'secret';
passport.use(new JwtStrategy(opts, (jwt_payload, done) => {
  Users.findOne({ username: jwt_payload.username }, (err, user) => {
    if (err) {
      return done(err, false);
    } else if (user) {
      return done(null, user);
    } else {
      return done(null, false);
    }
  });
}));

app.get('/', (req, res) => {
  res.json('Meditation App Test');
});

app.post('/signup', (req, res) => {
  //ADD remember me logic
  const tokenData = {
    username: req.body.username,
    password: req.body.password,
    completions: 0,
  };
  Users.findOne({ username: req.body.username })
    .then((results) => {
      if (results === null) {
        const user = new Users(tokenData);
        user.save((err, createdUser) =>{
          if (err) {
            console.error(err);
            res.status(400).send('there was an error creating the user');
          } else {
            tokenData._id = createdUser._id;
            const token = jwt.sign(tokenData, 'secret');
            res.status(201).send(token);
          }
        })
      } else {
        res.status(401).send('Sorry, a user with that name already exists');
      }
    })
});

app.get('/todo', passport.authenticate('jwt', { session: false }), (req, res) => {
  const userId = req.user._id;
  const date = req.headers.date;
  Todos.find({ userId, date })
    .then((results) => {
      // console.log(results);
      res.status(200).send(results);
    })
    .catch((err) => {
      console.error(err);
      res.status(404).send(err);
    });
});

app.post('/todo', passport.authenticate('jwt', { session: false }), (req, res) => {
  const todoData = { userId: req.user._id, item: req.body.todo, date: req.body.date };
  const todo = new Todos(todoData);
  todo.save((err, createdTodo) => {
    if (err) {
      console.error(err);
      res.status(500).send(err);
    } else {
      res.status(201).send(createdTodo);
    }
  })
});

app.post('/signin', (req, res) => {
  //add remember me logic
  console.log(req.body.rememberMe)
  Users.findOne({ username: req.body.username })
    .then((user) => {
      console.log(user, "this is user")
      console.log(req.body.username, "this is body user")
      if (user.password !== req.body.password) {
        res.send('Sorry, that password was incorrect');
      } else {
        const tokenData = {
          id: user._id,
          username: user.username,
        };
        const token = jwt.sign(tokenData, 'secret');
        res.send(token);
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(404).send(err);
    });
});

// Just a test route to see that auth is working correctly
app.get('/userCompletions', passport.authenticate('jwt', { session: false }), (req, res) => {
  Users.findById(req.user._id, (err, user) =>{
    if(err){
      console.error(err);
    }else{
      res.status(200).send(`${user.completions}`);
    }
  });
})

app.post('/tokens', (req, res) =>{
  let messages = [];
  let somePushTokens = [];
  somePushTokens.push(req.body.token.value);
  for (let pushToken of somePushTokens) {
    // Each push token looks like ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]

    // Check that all your push tokens appear to be valid Expo push tokens
    if (!Expo.isExpoPushToken(pushToken)) {
      console.error(`Push token ${pushToken} is not a valid Expo push token`);
      continue;
    }

    // Construct a message (see https://docs.expo.io/versions/latest/guides/push-notifications.html)
    messages.push({
      to: pushToken,
      sound: 'default',
      body: 'This is a test notification',
      data: {
        withSome: 'data'
      },
    })
  }

  // The Expo push notification service accepts batches of notifications so
  // that you don't need to send 1000 requests to send 1000 notifications. We
  // recommend you batch your notifications to reduce the number of requests
  // and to compress them (notifications with similar content will get
  // compressed).
  let chunks = expo.chunkPushNotifications(messages);

  (async () => {
    // Send the chunks to the Expo push notification service. There are
    // different strategies you could use. A simple one is to send one chunk at a
    // time, which nicely spreads the load out over time:
    for (let chunk of chunks) {
      try {
        let receipts = await expo.sendPushNotificationsAsync(chunk);
        // console.log(receipts);
      } catch (error) {
        console.error(error);
      }
    }
  })();
  res.status(201).send('token received')
});

app.post('/journal', passport.authenticate('jwt', {session: false}), (req, res) => {
  // console.log('req.body', req.body)
  // console.log('req.user', req.user);
  const entry = new Journals({
    userId: req.user._id,
    entry: req.body.entry,
    date: req.body.date.dateString,
  });
  entry.save((err, savedEntry) => {
    if(err){
      console.error(err);
      res.status(400).send('there was an error in saving the journal entry');
    }else{
      Users.findById(req.user._id, (err, user) =>{
        if(err){
          console.error(err);
          res.status(500).send(err);
        }else{
          user.completions = ++user.completions;
          user.save((err, updatedUser) =>{
            // console.log('updated user: ', updatedUser);
            res.status(201).send(`journal entry for ${updatedUser.username} saved`);
          })
        }
      })
    }
  });
});

app.get('/affirmations', 
// passport.authenticate('jwt', { session: false }), 
(req, res) => {
  Affirmations.find()
    .then((results) => {
      let now = new Date();
      let dayOfTheMonth = dateFormat(now, "d");
      // console.log(dayOfTheMonth);
      res.status(200).send(results[0].affirmations[dayOfTheMonth-1]);
    })
    .catch((err) => {
      console.error(err);
      res.status(404).send(err);
    });
});

app.get('/adjectives', 
// passport.authenticate('jwt', { session: false }), 
(req, res) => {
  Adjectives.find()
    .then((results) => {
      let randomAdjective = Math.floor(Math.random() * results[0].adjectives.length);
      res.status(200).send(results[0].adjectives[randomAdjective]);
    })
    .catch((err) => {
      console.error(err);
      res.status(404).send(err);
    });
});

// app.get('/protected', passport.authenticate('jwt', {session: false}), (req, res) => {
//   res.send(JSON.stringify(req.user));
// })

app.listen(port, () => {
  console.log(`App is listening on ${port}`);
});
