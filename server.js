require('dotenv').config();

var Github = require('github-api');
var express = require('express');
var bodyParser = require('body-parser');
var mongodb = require('mongodb');

const port = process.env.PORT || 8080;
const user = process.env.DB_USER;
const pass = process.env.DB_PASS;
const dbName = process.env.DB_NAME;
const uri = 'mongodb://' + user + ':' + pass + '@ds023000.mlab.com:23000/' + dbName;
const gh = new Github({ token: process.env.CLUTCHBOT_TOKEN });

var app = express();
app.use(bodyParser.json());

mongodb.MongoClient.connect(uri, function(err, db) {
  if(err) throw err;

  app.post('/octocat', function (req, res) {
    function getGithubUser(db, slackUser) {
      return new Promise(function(resolve) {
        var userMaps = db.collection('user-maps');
        userMaps.find({ slack: slackUser }, function(err, doc) {
          if(err) throw err;
          resolve(doc.github);
        });
      });
    }

    let repoName = req.body.result.parameters.repo;
    let repo = gh.getRepo('PartCycleTech', repoName);
    let PRs = repo.listPullRequests().then((prs) => {
      let attachments = prs.data.map((pr) => {
        return {
          title: `#${pr.number} - ${pr.title}`,
          title_link: pr.html_url,
          author_name: pr.user.login,
          author_link: pr.user.html_url
        };
      });

      res.send({
        speech: `Found ${prs.data.length} pull-requests!`,
        displayText: `Found ${prs.data.length} pull-requests!`,
        data: {
          slack: {
            text: `I found ${prs.data.length} open pull-requests!`,
            attachments
          }
        }
      });
    });
  });
});

app.listen(port, function () {
  console.log(`Listening on port ${port}.`);
});
