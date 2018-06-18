var express = require('express');
var http = require('https');
var router = express.Router();
var io = require('socket.io')(http);
var watson = require('watson-developer-cloud');
var PythonShell = require('python-shell');

//https://github.com/extrabacon/python-shell/issues/113 : /python-shell/index.js, on line 72
//After installation, comment out the warning printing if tensorflow is having trouble importing
var options = {
    pythonPath: '/usr/bin/python3',
}
var pyshell = new PythonShell('/../src/classifier/website_interface.py',options);

var authorization = new watson.AuthorizationV1({
  username: 'a9e2f186-462c-4109-b220-3cfcdc31c9f6',
  password: 'H27yANqAuMLr',
  url: 'https://stream.watsonplatform.net/authorization/api'
});

var params = {
    url: 'https://gateway.watsonplatform.net/speech-to-text/api'
};

router.get('/', function(req, res, next) {
  res.render('index');
});
router.get('/clint', function(req, res, next) {
  res.render('index');
});
router.get('/dan', function(req, res, next) {
  res.render('index');
});
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
        console.log(data);
        /*do the question processing stuff here*/
        pyshell.send(data.Question+','+socket.id+','+data.Mentor);
    });
});

pyshell.on('message',function(message){ //if a message is recieved from python
    message = message.split('(');
    if (message[1]){    //this is the message we need
        message = message[1];
        processedOutput = {"videoID": message.slice(1,message.indexOf(",")-1),"transcript": message.slice(message.indexOf(",")+3,message.indexOf(")")-1),"clientID": message.slice(message.indexOf(")")+1)}
        io.to(processedOutput.clientID).emit("receiveAnswer",{"videoID": processedOutput.videoID, "transcript": processedOutput.transcript});    //sends back to the same client
        console.log('videoID: ' + processedOutput.videoID);
        console.log('transcript: '+ processedOutput.transcript);
    }
});

module.exports = router;
module.exports.io=io;
