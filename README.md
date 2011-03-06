# cluster-socket.io

This library is a temporary stop-gap for using socket.io's `broadcast` method under https://github.com/LearnBoost/cluster

`npm install cluster-socket.io`

### Original problem

cluster works great when it comes to short lived connections.  Socket.io connections are 'sticky' which make them stay on a single node process.  This is problematic when you want to send a message to every client connected.

### How does it work?

Unix sockets handle communication between silo->cluster->silos.


## Usage

`var bridge = require('cluster-socket.io')`

 - `bridge`.master(socket, path)
  - `socket` is the server object returned by  `socket.io.listen`
  - `path` is a path to a directory to conain the UNIX sockets for IPC between the master and worker processes

 - bridge.child(path)
  - `path` is a path to a directory to conain the UNIX sockets for IPC between the master and worker processes

## Example

    var http   = require('http')
      , fs     = require('fs')
      , io     = require('socket.io')
      , bridge      = require('cluster-socket.io')
      , socketPath  = __dirname + '/sockets'
      , server
      , socket;

    server = http.createServer(function(req, res){
      res.writeHead(200, {'Content-Type': 'text/html'});
      res.write('<h1>Welcome.</h1>');
      res.end();
    }),

    socket = io.listen(server)

    bridge.child(socket, socketPath);

    io.on('connection', function(client){
      // Use socket.io as you normally would
    });

    cluster(app)
      .use(bridge.master(socketPath))
      .listen(3000);

