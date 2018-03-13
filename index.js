const Expo = require('expo-server-sdk');
const mongoose = require('mongoose');

require('dotenv').config();

const express = require('express');
const bodyParser = require ('body-parser');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 9000;

const app = express();

const expo = new Expo();

mongoose.connect(`mongodb://admin:${process.env.DBPASSWORD}@ds133776.mlab.com:33776/meditation`);

const Affirmations = mongoose.model('affirmations', { affirmations: Array });
const Users = mongoose.model('users', { username: String, password: String, completions: Number});
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

app.post('/signin', (req, res) => {
  Users.findOne({ username: req.body.username })
    .then((user) => {
      if (user.password !== req.body.password) {
        res.send('Sorry, that password was incorrect');
      } else {
        const tokenData = {
          id: user._id,
          username: user.username,
        };
        const token = jwt.sign(tokenData, 'secret');
        res.status(201).send(token);
      }
    })
    .catch((err) => res.status(404).send(err));
});

// Just a test route to see that auth is working correctly
app.get('/protected', passport.authenticate('jwt', { session: false }), (req, res) => {
  res.send(JSON.stringify(req.user));
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
        console.log(receipts);
      } catch (error) {
        console.error(error);
      }
    }
  })();
  res.status(201).send('token received')
});

app.post('/journal', passport.authenticate('jwt', {session: false}), (req, res) => {
  console.log('req.body', req.body);
  console.log('req.user', req.user);
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
      res.status(201).send('entry saved successfully');
    }
  });
});

// app.get('/protected', passport.authenticate('jwt', {session: false}), (req, res) => {
//   res.send(JSON.stringify(req.user));
// })

app.listen(port, () => {
  console.log(`App is listening on ${port}`);
});
