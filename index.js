const Expo = require('expo-server-sdk');
const mongoose = require('mongoose');

require('dotenv').config();

const express = require('express');
const bodyParser = require ('body-parser');
const port = process.env.PORT || 9000;

const app = express();

const expo = new Expo();

mongoose.connect(`mongodb://admin:${process.env.DBPASSWORD}@ds133776.mlab.com:33776/meditation`);

const Affirmations = mongoose.model('affirmations', { affirmations: Array });
const Users = mongoose.model('users', { users: Array});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.json('Meditation App Test');
});

app.get('/affirmations', (req, res) => {
  mongoose.model('affirmations').find({}, (err, affirmations) => {
    if(err){
      console.error(err);
    }
    res.status(200).send(affirmations);
  });
});

app.post('/login', (req, res) => {
  //successful login currently is username: "user", password: "password"
  mongoose.model('users').find({}, (err, users) => {
    if(err){
      console.error(err);
    }else{
      for(let i=0; i<users.length; i++){
        if(users[i].username === req.body.username && users[i].password === req.body.password){
          res.status(201).send('user login successful');
        }else{
          res.status(201).send('user not found');
        }
      }
    }
  });
})

app.post('/tokens', (req, res) =>{
  console.log('push token: ', req.body);
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
