'use strict';

const server = require('./server');

server.start(() => {
  console.log('Started');
});
