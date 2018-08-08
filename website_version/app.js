 "use strict";
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var cons = require('consolidate');
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var fs = require('fs');
var app = express();
var apptwo = express();
var https = require('https');
var http = require('http');
var request = require('request');
var parse = require('csv-parse/lib/sync')
// view engine setup
app.engine('html', cons.swig)
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'html');

if(process.argv[2] != "dev"){
	var options = {
	  key: fs.readFileSync('/etc/letsencrypt/live/mentorpal.org/privkey.pem'),
	  cert: fs.readFileSync('/etc/letsencrypt/live/mentorpal.org/fullchain.pem')
	};
	var servertwo = http.createServer(apptwo);
}
if (process.argv[2]!="dev"){
	var server = https.createServer(options, app);
} else {
	var server = http.createServer(app);
}

//checks if videos are loaded on
var filesID = ['utterance_data.csv', 'classifier_data.csv'];
for (let k = 0; k<2;k++){
	var mentorList = ['clint','dan','julianne','carlos'];
	for(let j = 0; j<mentorList.length; j++) {
		console.log(mentorList[j]);
		var x = fs.readFileSync('mentors/'+mentorList[j]+'/data/'+filesID[k]);
	  var rows = parse(x, {columns: true, trim: false});
		for (let i = 0; i<rows.length; i++) {
			request.head('https://pal3.ict.usc.edu/resources/mentor/'+mentorList[j]+'/'+rows[i]["ID"], function (error, response, body) {
			    if (!error && response.statusCode == 200 && rows[i]) {
			  		//console.log(rows[i]["ID"] + " found");// Continue with your processing here.
			    } else if (rows[i]) {
						console.log(rows[i]["ID"] + " not found!");
					}
			});
		}
	}
}


app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
indexRouter.io.listen(server);
if(process.argv[2] == "dev"){
	server.listen(8000, function(){
		console.log('redirecting');
	});
} else {
	server.listen(443, function(){
	    console.log('Listening for http requests');
	});
	servertwo.listen(80, function(){
		console.log('redirecting');
	});
	apptwo.get('*',function(req,res,next){
		res.redirect(['https://', req.get('Host'), req.url].join(''));
	});
}

module.exports = app;
