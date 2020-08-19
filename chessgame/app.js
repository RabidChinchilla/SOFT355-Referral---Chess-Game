var express = require('express');
var app = express();
app.use(express.static('public'));
app.use(express.static('homepage'));
var http = require('http').Server(app);
var io = require('socket.io')(http);
var mongo = require('mongodb').MongoClient;
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/chessgame', { useNewUrlParser: true }, function(err, db){
  if(err){
    console.log("database not connected");
  }
  else{
    console.log("database connected");
  }
});
var leaderboardSchema = new mongoose.Schema({name: String, wins: Number}, {collection: 'leaderboard'});
var leaderboard = mongoose.model('leaderboard', leaderboardSchema);
//var leaderboardPretty = leaderboard.prototype.toObject();
var port = process.env.PORT || 3000;

//declaring as objects
var lobbyUsers = {};
var users = {};
var activeGames = {};

//when connecting to localhost:3000 send the file below
app.get('/', function(req, res) {
 res.sendFile(__dirname + '/public/default.html');
});

//when connecting to localhost:3000/homepage send the file below
app.get('/homepage/', function(req, res) {
 res.sendFile(__dirname + '/homepage/homepage.html');
});

//when connecting to localhost:3000/leaderboard send the database and show it in a simple form
app.get('/leaderboard', function(req, res){
  mongoose.model('leaderboard').find(function(err, leaderboard) {
    res.send(leaderboard);
    //res.send(leaderboardPretty);
  });
});


//On connection from a socket
io.on('connection', function(socket) {
    console.log('new connection ' + socket.id);

    socket.on('login', function(userId) {
       doLogin(socket, userId); //call the doLogin function when a new connection is made
       console.log("Logging in user: " + userId);
    });

    function doLogin(socket, userId) {
        socket.userId = userId; //take the sockect and usedID

        if (!users[userId]) { //if the userID doesn't already exist create a new user
            console.log('creating new user: '+ userId);
            users[userId] = {userId: socket.userId, games:{}};
        }
        else {
            console.log('user found!'); //if the user already exists output each game they're in
            Object.keys(users[userId].games).forEach(function(gameId) {
                console.log('gameid - ' + gameId);
            });
        }

        socket.emit('login', {users: Object.keys(lobbyUsers), games: Object.keys(users[userId].games)}); //emit the users and the active games
        lobbyUsers[userId] = socket;

        socket.broadcast.emit('joinlobby', socket.userId);
    };

    //send an invite to another player by clicking on their name
    socket.on('invite', function(opponentId) {
        console.log('got an invite from: ' + socket.userId + ' --> ' + opponentId);
        //take the user and their opponent out of the lobby of users available to send invited to
        socket.broadcast.emit('leavelobby', socket.userId);
        socket.broadcast.emit('leavelobby', opponentId);

        //define a var for the game
        var game = {
            id: Math.floor((Math.random() * 100) + 1),
            board: null,
            users: {white: socket.userId, black: opponentId}
        };
        //set the game id from a random number
        socket.gameId = game.id;
        //add the game to the active games list
        activeGames[game.id] = game;

        //give each user a colour
        users[game.users.white].games[game.id] = game.id;
        users[game.users.black].games[game.id] = game.id;

        console.log('starting game: ' + game.id);
        //tell each client to join the game
        lobbyUsers[game.users.white].emit('joingame', {game: game, color: 'white'});
        lobbyUsers[game.users.black].emit('joingame', {game: game, color: 'black'});

        //remove the users from the lobby
        delete lobbyUsers[game.users.white];
        delete lobbyUsers[game.users.black];

        //broadcast the game
        socket.broadcast.emit('gameadd', {gameId: game.id, gameState:game});
    });

    //resume the game when the user clicks on their active games
     socket.on('resumegame', function(gameId) {
        console.log('ready to resume game: ' + gameId);

        socket.gameId = gameId;
        var game = activeGames[gameId];

        users[game.users.white].games[game.id] = game.id;
        users[game.users.black].games[game.id] = game.id;

        console.log('resuming game: ' + game.id);
        if (lobbyUsers[game.users.white]) {
            lobbyUsers[game.users.white].emit('joingame', {game: game, color: 'white'});
            delete lobbyUsers[game.users.white];
        }

        if (lobbyUsers[game.users.black]) {
            lobbyUsers[game.users.black] &&
            lobbyUsers[game.users.black].emit('joingame', {game: game, color: 'black'});
            delete lobbyUsers[game.users.black];
        }
    });

    //send the move once it has been done and output the move data to node.js
    socket.on('move', function(msg) {
        socket.broadcast.emit('move', msg);
        activeGames[msg.gameId].board = msg.board;
        console.log(msg);
    });

    //when the resign button is clicked
    socket.on('resign', function(msg) {
        console.log("resign: " + msg);

        delete users[activeGames[msg.gameId].users.white].games[msg.gameId];
        delete users[activeGames[msg.gameId].users.black].games[msg.gameId];
        delete activeGames[msg.gameId];

        socket.broadcast.emit('resign', msg);
    });

    //when the socket disconnects
    socket.on('disconnect', function(msg) {

      console.log(msg);

      if (socket && socket.userId && socket.gameId) {
        console.log(socket.userId + ' disconnected');
        console.log(socket.gameId + ' disconnected');
      }

      delete lobbyUsers[socket.userId];

      socket.broadcast.emit('logout', {
        userId: socket.userId,
        gameId: socket.gameId
      });
    });

    // homepage messages
    socket.on('homepagelogin', function() {
        console.log('homepage joined');
        socket.emit('homepagelogin', {games: activeGames});
    });

});

http.listen(port, function() {
    console.log('listening on *: ' + port);
});


//for JUnit Testing
app.post('/testConnection/',function(req, res){
  connectNoEmit(req, res);
});

function connectNoEmit(req, res)
{
  socket = {};
  socket.userId = req.userId;
  users[socket.userId] =
  {
      userId: 'testID',
      games: {},
  }
  res.send(users);
};
