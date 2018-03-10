require('dotenv').config();
const express = require('express');
const bodyParser = require ('body-parser');
const port = process.env.PORT || 9000;

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.json('Meditation App Test');
});

app.listen(port, () => {
  console.log(`App is listening on ${port}`);
});