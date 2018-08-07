var express = require('express');
var http = require('http');
var router = express.Router();
var io = require('socket.io')(http);
var watson = require('watson-developer-cloud');
var PythonShell = require('python-shell');
var fs = require('fs');
//https://github.com/extrabacon/python-shell/issues/113 : /python-shell/index.js, on line 72
//After installation, comment out the warning printing if tensorflow is having trouble importing
if(process.argv[2] == "dev"){
  var options = {
      pythonPath: 'E:/Python35/python.exe',
      //pythonPath: '/usr/bin/python3'
  }
} else {
  var options = {
      //pythonPath: 'E:/Python35/python.exe',
      pythonPath: '/usr/bin/python3'
  }
}
var pyshell = new PythonShell('/../src/classifier/website_interface.py',options);
var text = fs.readFileSync('./password.txt','utf8');
console.log(text);
var authorization = new watson.AuthorizationV1({
  username: 'a9e2f186-462c-4109-b220-3cfcdc31c9f6',
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
        console.log(data);
        /*do the question processing stuff here*/
        pyshell.send(data.Question+'~~'+socket.id+'~~'+data.Mentor);
        //console.log(data.Question+','+socket.id+','+data.Mentor);
    });
});

pyshell.on('message',function(message){ //if a message is recieved from python
    if (message){    //this is the message we need
      message = message.split("~~");
		io.to(message[1]).emit("receiveAnswer",{"videoID": message[1], "transcript": message[2]});    //sends back to the same client
    }
});

module.exports = router;
module.exports.io=io;
