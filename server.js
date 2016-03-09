var express = require('express');
var app = express()
var bodyParser = require('body-parser');
var morgan = require('morgan');
var mongoose = require('mongoose');

var jwt = require('jsonwebtoken')
var config= require('./config.js')
var User = require('./models/user')

var port = process.env.PORT|| 7000;
mongoose.connect(config.database)  //connects to the database
app.set('superSecret', config.secret);
//gotta use body parser to get info from post and url
app.use(bodyParser.urlencoded({ extended: false}))
app.use(bodyParser.json())

app.use(morgan('dev')) //using morgan to log requests to the console

app.get('/', function(req,res) {
  res.send('visit localhost:'+port+'/api')
});
app.listen(port)
console.log('server running on port ' + port)

//SAVING THE USER
app.get('/setup', function(req, res) {
  var me = new User({
    name: 'dwayne',
    password:'password', //tutorial purposes
    admin:true
  });
  //saving the user
  me.save(function(err) {
    if(err) throw err;

    console.log('user saved');
    res.json({success: true})
  })
})


var apiRoutes = express.Router();

apiRoutes.get('/', function(req,res) {
  res.json({message: 'welcome'})
});

//SHOWING THE USER
apiRoutes.get('/users', function(req, res) {
  User.find({}, function(err, users) {
    res.json(users);
  });
});

//ROUTE TO AUTHENTICATE A USER
apiRoutes.post('/authenticate', function(req,res) {

  //finding the user
  User.findOne({name:req.body.name}, function(err, user) {
    if(err) throw err;

    if(!user) {
      res.json({ success:false, message: 'Authentication failed. User not found'})
    } else if(user) {

      if(user.password != req.body.password) {   //checking if the passwords match
        res.json({ success:false, message:'Authentication failed. Wrong password'})
      } else {

        //when the user is found and the password is right, create a token.
        var token = jwt.sign(user,app.get('superSecret'), {
          expiresInMinutes: 1440  //24hours
        })

        //return the information including the token as JSON
        res.json({
          success: true,
          message: 'here is your token',
          token: token
        });
      }
    }
  })
})

//MIDDLEWARE TO PROTECT API ROUTES
//route middleware to verify a token.
apiRoutes.use(function(req,res, next) {
  var token = req.body.token|| req.query.token|| req.headers['x-access-token'] // checking for token in header of url

  //decode token
  if(token) {
    jwt.verify(token, app.get('superSecret'), function(err, decode) {
      if(err) {
        return res.join({success: false, message: 'failed to authenticate token.'})
      } else{
        //if everything is goood, save to request for use in other routes.
        req.decode = decoded;
        next()
      }
    })
  } else {
    //if there is no token we return an Error
    return res.status(403).send({
      success: false,
      message:'No token provided'
    });
  }
})

app.use('/api', apiRoutes)
