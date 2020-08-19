(function () {

    WinJS.UI.processAll().then(function () {

      var socket, serverGame;
      var username, playerColor;
      var game, board;
      var usersOnline = [];
      var myGames = [];
      socket = io();
      //var mongo = require('mongodb').MongoClient;
      //var mongoose = require('mongoose');
      //mongoose.connect('mongodb://localhost:27017/chessgame', { useNewUrlParser: true });
      //var leaderboardSchema = new mongoose.Schema({name: String, wins: Number}, {collection: 'leaderboard'});
      //var leaderboard = mongoose.model('leaderboard', leaderboardSchema);


      // Socket.io handlers
      socket.on('login', function(msg) { //on login update user and games list
            usersOnline = msg.users;
            updateUserList();

            myGames = msg.games;
            updateGamesList();
      });

      socket.on('joinlobby', function (msg) {
        addUser(msg); //add user to lobby
      });

       socket.on('leavelobby', function (msg) {
        removeUser(msg); //remove user from lobby
      });

      socket.on('gameadd', function(msg) {
      });

      socket.on('resign', function(msg) {
            if (msg.gameId == serverGame.id) {
              window.alert("Your opponent has resigned"); //let's player know their opponent has resigned
              socket.emit('login', username);

              $('#page-lobby').show(); //show lobby and hide the game board
              $('#page-game').hide();
            }
      });

      socket.on('joingame', function(msg) {
        console.log("joined as game id: " + msg.game.id );
        playerColor = msg.color;
        initGame(msg.game);

        $('#page-lobby').hide(); //hide lobby and show the game board
        $('#page-game').show();

      });

      socket.on('move', function (msg) {
        if (serverGame && msg.gameId === serverGame.id) {
           game.move(msg.move);
           board.position(game.fen()); //after a move update the game board position using the chess.js libraries
        }
      });


      socket.on('logout', function (msg) {
        removeUser(msg.username);
      });



      // Menus
      $('#login').on('click', function() {
        username = $('#username').val();

        if (username.length > 0) { //if username is 0 do not enter the lobby
            $('#userLabel').text(username);
            socket.emit('login', username);

            $('#page-login').hide();
            $('#page-lobby').show();
        }
      });

      $('#game-back').on('click', function() {
        socket.emit('login', username); //on back button go back to the lobby

        $('#page-game').hide();
        $('#page-lobby').show();
      });

      $('#game-resign').on('click', function() {
        socket.emit('resign', {userId: username, gameId: serverGame.id});
        window.alert("You have resigned"); //sends alert to player to has resigned
        socket.emit('login', username); //when resigning go back to lobby and don't show the game as active
        $('#page-game').hide();
        $('#page-lobby').show();
      });

      var addUser = function(userId) {
        usersOnline.push(userId);
        updateUserList();
      };

     var removeUser = function(userId) {
          for (var i=0; i<usersOnline.length; i++) {
            if (usersOnline[i] === userId) {
                usersOnline.splice(i, 1);
            }
         }
         updateUserList();
      };

      var updateGamesList = function() {
        document.getElementById('gamesList').innerHTML = '';
        myGames.forEach(function(game) {
          $('#gamesList').append($('<button>').text('#'+ game).on('click', function() {
                          socket.emit('resumegame',  game);
                        }));
        });
      };

      var updateUserList = function() {
        document.getElementById('userList').innerHTML = '';
        usersOnline.forEach(function(user) {
          $('#userList').append($('<button>').text(user).on('click', function() {
                          socket.emit('invite',  user);
                        }));
        });
      };

      //document.getElementById('leaderboard').innerHTML = '';
      //leaderboard.forEach(function(leaderboard) {
      //  $('#gamesList').append($('<button>').text('#'+ leaderboard);


      // Chess Game

      var initGame = function (serverGameState) {
        serverGame = serverGameState;

          var cfg = {
            draggable: true,
            showNotation: false,
            orientation: playerColor,
            position: serverGame.board ? serverGame.board : 'start',
            onDragStart: onDragStart,
            onDrop: onDrop,
            onSnapEnd: onSnapEnd
          };

          game = serverGame.board ? new Chess(serverGame.board) : new Chess();
          board = new ChessBoard('game-board', cfg);
      }

      // do not pick up pieces if the game is over
      // only pick up pieces for the side to move
      var onDragStart = function(source, piece, position, orientation) {
        if (game.game_over() === true || (game.turn() === 'w' && piece.search(/^b/) !== -1) || (game.turn() === 'b' && piece.search(/^w/) !== -1) || (game.turn() !== playerColor[0])) {
          return false;
        }
      };

      var onDrop = function(source, target) {
        // see if the move is legal
        var move = game.move({
          from: source,
          to: target,
          promotion: 'q' //always promote to a queen for simplicity
        });

        // illegal move
        if (move === null) {
          return 'snapback';
        }
        else {
           socket.emit('move', {move: move, gameId: serverGame.id, board: game.fen()});
        }
      };

      // update the board position after the piece snap
      // for castling, en passant, pawn promotion
      var onSnapEnd = function() {
        board.position(game.fen());
      };
    });
})();
