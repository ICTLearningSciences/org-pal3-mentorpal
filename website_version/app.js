var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var cons = require('consolidate');
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();
var http = require('http').Server(app);
// view engine setup
app.engine('html', cons.swig)
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'html');


app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
indexRouter.io.listen(http);
http.listen(80, function(){
    console.log('Listening for http requests');
})
module.exports = app;
