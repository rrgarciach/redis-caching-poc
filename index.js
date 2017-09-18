const express = require('express');
const request = require('superagent');

const PORT = process.env.PORT || 3030;

const redis = require('redis');
const REDIS_PORT = process.env.REDIS_PORT || 6379;

const app = express();
const client = redis.createClient(REDIS_PORT);

function respond(org, numberOfRepos) {
  return `Organization "${org}" has ${numberOfRepos} public repositories.`;
}

function getNumberOfRepos(req, res, next) {
  const org = req.query.org;
  request.get(`https://api.github.com/users/${org}/repos`, function (err, response) {
    if (err) throw err;

    // response.body contains an array of public repositories
    const repoNumber = response.body.length;
    // set expiry to 1,800 seconds (30 minutes)
    client.setex(org, 1800, repoNumber);
    res.send(respond(org, repoNumber));
  });
};

function cache(req, res, next) {
  const org = req.query.org;
  client.get(org, function (err, data) {
    if (err) throw err;

    if (data) {
      res.send(respond(org,data));
    } else {
      next();
    }
  });
}

app.get('/repos', cache, getNumberOfRepos);

app.listen(PORT, function () {
  console.log('app listening on port', PORT);
});
