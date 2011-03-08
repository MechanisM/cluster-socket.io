/**
  MIT License
**/
var
fs      = require('fs'),
path    = require('path'),
net     = require('net'),
log     = require('log'),
boundry = '\n.\n';

exports = module.exports = function(io, host, port) {
  host = host || "127.0.0.1";
  port = port || 43000;


  // Clients
  process.nextTick(function() {
    if (parseInt(process.env.CLUSTER_MASTER_PID, 10) !== process.pid) {
      var
      buf       = '',
      sock      = net.createConnection(port, host),
      broadcast = io.broadcast;

      sock.on('connect', function() {
        // setup a new broadcast method
        io.broadcast = function(msg, except) {
          sock.write(JSON.stringify({
            type    : 'broadcast',
            message : msg
          }) + boundry);

          return broadcast.call(io, msg, except);
        };
      })

      sock.on('data', function(chunk) {
        buf += chunk.toString();
        var
        parts   = buf.split(boundry),
        partial = '';

        // If the boundry occurs at the end of the last chunk
        // re-use the last element in the array as it is a
        // partial message
        if (parts[parts.length - 1]) {
          buf = parts.pop();

        // Otherwise reset, and clean off the empty item at the end
        } else {
          buf = '';
          parts.pop();
        }

        parts.forEach(function(str) {
          try {
            var message = JSON.parse(str);
            if (message.type === 'broadcast') {
              console.log('real broadcast', message.message);
              broadcast.call(io, message.message);
            }
          } catch (e) {
            console.log("Message could not be decoded", str, e.stack);
          }
        });
      });

      sock.on('error', function(e) {
        console.log('client died', e.stack);
      })
    }
  });


  return function(master) {
    var
    workers = [],

    // spawn up a TCP server on 127.0.0.1 (internal)
    server = net.createServer(function(worker) {

      // simply stream everything to the workers
      workers.forEach(function(w) {
        w.pipe(worker, { end: false });
        worker.pipe(w, { end: false });
        w.setMaxListeners(workers.length * 2);
        worker.setMaxListeners(workers.length * 2);
      });



      // Method for removing workers when they
      // error out or close
      var removeWorker = function() {
        var idx = workers.indexOf(worker);

        if (idx > -1) {
          workers.splice(idx,1);
        }
      };

      workers.push(worker);

      worker.on('error', removeWorker);
      worker.on('close', removeWorker);
    });

    server.listen(port, host);
  };
};

// // Patch socket IO so its 'broadcast' method also sends
// // the message to the master
// module.exports.child = function(io, socketDirectory) {
//   var
//   pid       = process.pid,
//   socket    = path.join(socketDirectory || './sockets', pid + '.sock'),
//   broadcast = io.broadcast,
//
//   // Listen to the socket
//   ipc       = net.createServer(function(c) {
//     c.on('data', function(d) {
//       var msg = false;
//       try {
//         msg = JSON.parse(d.toString());
//         if (msg.type && msg.type === "broadcast") {
//
//           // Broadcast to this silo
//           broadcast.call(io, msg.message);
//         }
//       } catch (e) {
//         console.log(e.stack);
//       }
//     });
//
//     // Replace local broadcast with messaging to the master
//     io.broadcast = function(msg, except) {
//       c.write(JSON.stringify({
//         type    : 'broadcast',
//         message : msg
//       }));
//       return broadcast.call(io, msg, except);
//     };
//   });
//   ipc.listen(socket);
// };
