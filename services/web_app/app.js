 "use strict";
const createError = require('http-errors')
const express = require('express')
const path = require('path')
const cookieParser = require('cookie-parser')
const cons = require('consolidate')
const indexRouter = require('./routes/index')
const usersRouter = require('./routes/users')
const fs = require('fs')
const app = express()
const apptwo = express()
const https = require('https')
const http = require('http')

const requireEnv = require('./utils/require_env')
app.engine('html', cons.swig)
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'html')

const useSSL = false //(process.env.NODE_ENV || 'dev') !== 'dev'
if(useSSL){
	var options = {
	  key: fs.readFileSync('/etc/letsencrypt/live/mentorpal.org/privkey.pem'),
	  cert: fs.readFileSync('/etc/letsencrypt/live/mentorpal.org/fullchain.pem')
	}
	var servertwo = http.createServer(apptwo)
}

if (useSSL){
	var server = https.createServer(options, app)
} else {
	var server = http.createServer(app)
}



app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, 'public')))

app.use('/', indexRouter)
app.use('/processor', usersRouter)
app.use('/validate', require('./routes/validate'))

const port = process.env.NODE_PORT || 3000
indexRouter.io.listen(server)
if(useSSL){
  server.listen(443, function(){
	    console.log('Listening for http requests')
	})
	servertwo.listen(80, function(){
		console.log('redirecting')
	})
	apptwo.get('*',function(req,res,next){
		res.redirect(['https://', req.get('Host'), req.url].join(''))
	})
} else {
	server.listen(port, function(){
		console.log(`node listening on port ${port}`)
	})
}

module.exports = app
