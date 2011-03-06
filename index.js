/**
  MIT License
**/
var
fs   = require('fs'),
path = require('path'),
net  = require('net'),
log  = require('log');

module.exports.master = function(socketDirectory) {
  var connections = [];
  return function(master) {
    // create a new socket
    master.on('worker', function(worker) {
      var socket = path.join(socketDirectory || './sockets', worker.proc.pid + '.sock');
      setTimeout(function connect() {
        fs.stat(socket, function(err) {
          if (!err) {
            client = net.createConnection(socket);
 
            // Hook everything up
            connections.forEach(function(v) {
              client.pipe(v);
              v.pipe(client);
            });

            connections.push(client);

          } else {
            setTimeout(connect, 10);
          }
        });
      }, 10);
    });
    
    // cleanup
    master.on('worker disconnected', function(worker) {
      
    });
  };
};

// Patch socket IO so its 'broadcast' method also sends
// the message to the master
module.exports.child = function(io, socketDirectory) {
  var
  pid       = process.pid,
  socket    = path.join(socketDirectory || './sockets', pid + '.sock'),
  broadcast = io.broadcast,

  // Listen to the socket
  ipc       = net.createServer(function(c) {
    c.on('data', function(d) {
      var msg = false;
      try {
        msg = JSON.parse(d.toString());
        if (msg.type && msg.type === "broadcast") {

          // Broadcast to this silo
          broadcast.call(io, msg.message);
        }
      } catch (e) {
        console.log(e.stack);
      }
    });

    // Replace local broadcast with messaging to the master
    io.broadcast = function(msg, except) {
      c.write(JSON.stringify({
        type    : 'broadcast',
        message : msg
      }));
      return broadcast.call(io, msg, except);
    };
  });
  ipc.listen(socket);
};