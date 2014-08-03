var eb = require('../lib/echoback-stream');
var through = require("through");



var serial = through(function(write){
  this.queue()
});



