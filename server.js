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
    let action = req.body.result.action;
    if (action === 'list-prs') {
      if (req.body.result.parameters.my && req.body.originalRequest) {
        let slackUser = req.body.originalRequest.data.event.user;
        return getGithubUsername(db, slackUser).then((githubUsername) => {
          let filterFn = (pr) => {
            let reviewers = pr.requested_reviewers.map(reviewer => reviewer.login);
            return reviewers.includes(githubUsername);
          };
          return listPrs(req, res, filterFn);
        });
      } else {
        return listPrs(req, res);
      }
      res.send({});
    }
  });
});

app.listen(port, function () {
  console.log(`Listening on port ${port}.`);
});

function listPrs(req, res, filterPrs = () => { return true; }) {
  let repoName = req.body.result.parameters.repo;
  let repo = gh.getRepo('PartCycleTech', repoName);
  let PRs = repo.listPullRequests().then((prs) => {
    let attachments = prs.data.filter(filterPrs).map((pr) => {
      return {
        title: `#${pr.number} - ${pr.title}`,
        title_link: pr.html_url,
        author_name: pr.user.login,
        author_link: pr.user.html_url
      };
    });

    res.send({
      speech: `Found ${attachments.length} pull-requests!`,
      displayText: `Found ${attachments.length} pull-requests!`,
      data: {
        slack: {
          text: `I found ${attachments.length} open pull-requests!`,
          attachments
        }
      }
    });
  });
}

function getGithubUsername(db, slackUser) {
  return new Promise(function(resolve) {
    var userMaps = db.collection('user-maps');
    userMaps.findOne({ slack: slackUser }, function(err, doc) {
      if(err) throw err;
      resolve(doc.github);
    });
  });
}
