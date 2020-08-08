//server file
var express = require('express');
var app = express();
app.use(express.static('public'));
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/public/default.html');
});

http.listen(port, function() {
    console.log('listening on *: ' + port);
});

io.on('connection', function(socket) {
  if (io.engine.clientsCount > 2)
  {
    socket.emit('err', { message: 'reach the limit of connections' })
    socket.disconnect()
    console.log('Disconnected...')
    return
  }
  else{
    console.log('new connection');
  }

    // Called when the client calls socket.emit('move')
    socket.on('move', function(msg) {
       socket.broadcast.emit('move', msg);
    });
});
