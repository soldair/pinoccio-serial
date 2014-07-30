
var DEBUG = process.env.DEBUG;

var through = require('through');
var _prompt = ">".charCodeAt(0);
var bindexof = require('buffer-indexof');
var empty = new Buffer(0);
module.exports = function(serialPort){
  var delim = new Buffer("\n")
  , state = 'start'
  , running = false
  , q = []  
  ;

  var s = through(function(command){
    if(typeof command == 'string') command = {command:command};
    if(!command || !command.command) return;

    q.push(command);
    run();  
  });

  s.lastData = Date.now();
  
  var bufs = empty;
  var resultbuf = '';
  var writing = new Buffer(0);
  var written = new Buffer(0);
  var writemax = 63;
  // i write out a line at a time
  serialPort.on('data',function(buf){
    //console.log('SBUF',buf.toString());
    if(written.length)
    {
      //console.log("WRITECHECK",written.toString(),"XXX",writing.toString());
      // if the rest of the written was found echo'd in the buffer, done
      if(buf.length > written.length && bindexof(buf,written) >= 0)
      {
        written = new Buffer(0);
      }else{
        // check every remainder of the buffer to see if it is the echo of the writing
        for(var i=0;i<buf.length;i++)
        {
          // found a chunk, remove it and print that many more bytes now
          if(bindexof(written,buf.slice(i)) == 0)
          {
            var len = buf.length - i;
            written = written.slice(len);
            break;
          }
        }
      }
      // write any more capacity, moving from writing into written buffers
      var cap = writemax - written.length;
      if(cap)
      {
        //console.log("WROTEMORE",len,writing.toString());
        serialPort.write(writing.slice(0,cap));
        written = Buffer.concat([written,writing.slice(0,cap)]);
        writing = writing.slice(cap);
      }
    }
    s.emit('log',buf);
    // DEBUG
    //process.stdout.write(buf);

    s.lastData = Date.now();

    var idx;
    while((idx = bindexof(buf,delim)) > -1){
      bufs = Buffer.concat([bufs,buf.slice(0,idx+1)]);
      this.emit('line',bufs);
      bufs = empty;
      buf = buf.slice(idx+1);
    }

    if(buf.length){
      bufs = Buffer.concat([bufs,buf])
    }


    if(bufs[0] == _prompt){// the prompt is not followed by a new line this just helps keep the state machine in a single block.
      // TODO
      // sometimes when you connect to serial a bit of data from the previous run may get flushed.
      // if there is not a "Wi-Fi backpack connecting.." message for a lead scout after the prompt then im good.
      // ill wait just a bit just to make sure.

      this.emit('line',bufs);
      bufs = empty;
    } 
  }).on('line',function(buf){
    if(state == 'prompt') {
      // i can ignore data comming from here until a command is issued
      debug('prompt###',buf+'');
    } else { 

      if(buf[0] == _prompt) {

        debug('end of result###',buf+'');

        if(state == 'result') {
          // transform stream baby!
          running.result = resultbuf;
          s.queue(running);
        } else {
          setImmediate(function(){
            s.emit('open');// the bitlash prompt is up.
          });
        }

        resultbuf = [];
        running = false;
        state = 'prompt';
        run();
      } else {

        debug(state,'result###',buf+'');
        resultbuf += buf;
      }

    }
  });

  function run(){
    if(state == 'prompt' && q.length) {
      state = 'result';
      var command = q.shift();
      running = command;
      //console.log("WRITING",command.command.trim());
      writing = new Buffer(command.command.trim()+"\n");
      written = writing.slice(0,writemax);
      writing = writing.slice(writemax);
      serialPort.write(written);
    }
  }
  return s;
}


function debug(){
  if(!DEBUG) return;
  console.log.apply(console,arguments);
}
