var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var cons = require('consolidate');
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();
var https = require('https');
// view engine setup
app.engine('html', cons.swig)
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'html');

var options = {
  key: fs.readFileSync('/etc/letsencrypt/keys/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/keys/fullchain.pem')
};
var server = https.createServer(options, app);
var io = require('socket.io')(server);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
indexRouter.io.listen(https);
server.listen(443, function(){
    console.log('Listening for http requests');
})
module.exports = app;
