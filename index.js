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
const Users = mongoose.model('users', { id: Number, username: String, password: String, completions: Number});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(passport.initialize());
app.use(passport.session());
const users = {};
let latestId = 0;

const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
var opts = {};
opts.jwtFromRequest = ExtractJwt.fromHeader('authorization'),
opts.secretOrKey = 'secret';
// opts.issuer = 'accounts.examplesoft.com';
// opts.audience = 'yoursite.net';
passport.use(new JwtStrategy(opts, (jwt_payload, done) => {
  // const user = users[jwt_payload.sub];
  const user = users[jwt_payload.id];
  return done(null, user);
  // user.findOne({ id: jwt_payload.sub }, (err, user) => {
  //   if (err) {
  //     return done(err, false);
  //   }
  //   if (user) {
  //     return done(null, user);
  //   } else {
  //     return done(null, false);
  //     // or you could create a new account
  //   }
  // });
}));

app.get('/', (req, res) => {
  res.json('Meditation App Test');
});

app.post('/signup', (req, res) => {
  users[latestId] = req.body;
  const tokenData = {
    id: latestId,
    username: req.body.username,
    password: req.body.password,
    completions: 0,
  };
  const user = new Users(tokenData);
  user.save(err =>{
    if (err) {
      console.error(err);
      res.status(400).send('there was an error creating the user');
    } else {
      console.log(`${tokenData.username} added successfully`);
      const token = jwt.sign(tokenData, 'secret');
      res.status(201).send(token);
    }
  })
  latestId++;
});

app.post('/signin', (req, res) => {
  res.status(201).send('success');
});

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

app.listen(port, () => {
  console.log(`App is listening on ${port}`);
});
