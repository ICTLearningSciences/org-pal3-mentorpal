var express = require('express')
const axios = require('axios')
var http = require('http')
var router = express.Router()
var io = require('socket.io')(http)
var watson = require('watson-developer-cloud')
const requireEnv = require('../utils/require_env')
const CLASSIFIER_API_URL = process.env.CLASSIFIER_API_URL || 'http://classifier-api:5000'

const createWatsonTokenGen = () => {
  try {
    return new watson.AuthorizationV1({
      username: requireEnv('WATSON_USER'),
      password: requireEnv('WATSON_PASSWORD'),
      url: 'https://stream.watsonplatform.net/authorization/api'
    })
  }
  catch(err) {
    console.error(`Watson Error: ${err.message}`)
    return null
  }
}

const watsonTokenGen = createWatsonTokenGen()

//********add a mentor here: copy paste the pattern*/
router.get('/', function(req, res, next) {
  res.render('home')
})
router.get('/clint', function(req, res, next) {
  res.render('index')
})
router.get('/clint/embed', function(req, res, next){
  res.render('index')
})
router.get('/dan', function(req, res, next) {
  res.render('index')
})
router.get('/dan/embed', function(req, res, next){
  res.render('index')
})
router.get('/julianne', function(req, res, next) {
  res.render('index')
})
router.get('/julianne/embed', function(req, res, next){
  res.render('index')
})
router.get('/carlos', function(req, res, next) {
  res.render('index')
})
router.get('/carlos/embed', function(req, res, next){
  res.render('index')
})

const queryMentor = async(mentorId, question) => {
  
  const res = await axios.get(
    `${CLASSIFIER_API_URL}/questions`, {
      params: {
        mentor: mentorId,
        query: question
      }
    }
  )
  return res
}

// TODO: why are web-browser clients using sockets????
//***********add above*/
io.on('connection', function(socket){

    if(watsonTokenGen) {
      watsonTokenGen.getToken(
        {
            url: 'https://gateway.watsonplatform.net/speech-to-text/api'
        }, 
        (err, token) => {  //get watson token
          if (!token) {
              console.log('Watson Token error:', err)
          } else {
              socket.emit('token',{'token':token})
          }
        }
      )
    }
    
    socket.on("sendQuestion", async function(data) {
        console.log(`socket rcved: sendQuestion ${JSON.stringify(data)}`)

        try {
          res = await queryMentor(data.Mentor, data.Question)

          if(res.status != 200) {
            console.error(`HTTP error ${res.status} processing question ${JSON.stringify(data)}`)
            return
          }
          
          io.to(socket.id).emit(
            "receiveAnswer", 
            {
              "videoID": res.data['answer_id'], 
              "transcript": res.data['answer_text']
            }
          )
        }
        catch(err) {
          console.error(`error processing question ${JSON.stringify(data)}\n message: ${err.message}\n ${err.stack}`)
        }
      }
    )
})

module.exports = router
module.exports.io=io
