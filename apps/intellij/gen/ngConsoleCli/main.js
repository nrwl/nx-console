'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
var rcpNode = require('ij-rpc-client');
var express = require('express');
var DOMAIN = 'ngConsoleServer';
var app = express();
var rpcPort = parseInt(process.argv[process.argv.length - 1], 10);
try {
  var rpcServer_1 = rcpNode.connect(rpcPort, {
    ngConsoleServer: {
      start: function(publicDir, port) {
        console.log('starting server with following dir: ', publicDir);
        app.use(express.static(publicDir));
        app.listen(port);
        rpcServer_1.send(DOMAIN, 'serverStarted');
      },
      shutdown: function() {
        if (rpcServer_1 != null) {
          console.log('shutting down server with following dir: ');
          // call Angular server app shutdown. We can still simply kill the process from java
          rcpNode.close(rpcServer_1);
          rpcServer_1.send(DOMAIN, 'serverStopped');
        }
      }
    }
  });
  rpcServer_1.send(DOMAIN, 'rpcInitialized');
} catch (e) {}
