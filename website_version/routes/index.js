var express = require('express');
var http = require('http');
var router = express.Router();
var io = require('socket.io')(http);
var watson = require('watson-developer-cloud');
var PythonShell = require('python-shell');
var fs = require('fs');
const appRoot = require('app-root-path').path
const path = require('path')

const options = {
    pythonPath: process.env.PYTHON_PATH || '/usr/local/bin/python3'
}

var pyshell = new PythonShell('src/website_interface.py',options);
const passwordPath = path.join(appRoot, 'password.txt')
var text = fs.readFileSync(passwordPath, 'utf8');
var authorization = new watson.AuthorizationV1({
  username: 'b339aacb-e633-4e40-b10d-6f5b300f59bf',
  password: text,
  url: 'https://stream.watsonplatform.net/authorization/api'
});
var params = {
    url: 'https://gateway.watsonplatform.net/speech-to-text/api'
};

//********add a mentor here: copy paste the pattern*/
router.get('/', function(req, res, next) {
  res.render('home');
});
router.get('/clint', function(req, res, next) {
  res.render('index');
});
router.get('/clint/embed', function(req, res, next){
  res.render('index');
});
router.get('/dan', function(req, res, next) {
  res.render('index');
});
router.get('/dan/embed', function(req, res, next){
  res.render('index');
});
router.get('/julianne', function(req, res, next) {
  res.render('index');
});
router.get('/julianne/embed', function(req, res, next){
  res.render('index');
});
router.get('/carlos', function(req, res, next) {
  res.render('index');
});
router.get('/carlos/embed', function(req, res, next){
  res.render('index');
});

//***********add above*/
io.on('connection', function(socket){
    console.log('A user has socket connected');
    authorization.getToken(params, function (err, token) {  //get watson token
        if (!token) {
            console.log('Watson Token error:', err);
        } else {
            socket.emit('token',{'token':token});
        }
    });
    socket.on("sendQuestion", function(data) {
        console.log('~Send Question~')
        console.log(data.Question)
        console.log(socket.id)
        console.log(data.Mentor)
        console.log(data.UserID)
        console.log(data.Blacklist)
        /*do the question processing stuff here*/
        pyshell.send(data.Question+'~~'+socket.id+'~~'+data.Mentor+'~~'+data.UserID+'~~'+JSON.stringify(data.Blacklist)+'~~');
    });
});

pyshell.on('message',function(message){ //if a message is recieved from python
    message = message.split("~~");
    if (message[2]){    //this is the message we need
		    io.to(message[1]).emit("receiveAnswer",{"videoID": message[2], "transcript": message[3]});    //sends back to the same client
    }
});

module.exports = router;
module.exports.io=io;