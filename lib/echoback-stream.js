
var through = require('through');

module.exports = function(stream,chunksize){

  var max = chunksize||63;
  var timeout = 5000;
  var writing = new Buffer(0);
  var written = new Buffer(0);  

  var writtenTimer;

  var ended = false;

  var s = through(function(data){
    writing = Buffer.concat([writing,data]);
    run();
  },function(){
    ended = true;
    if(!writing.length && !written.length) this.queue(null);
  })

  var output = new Buffer(0);

  stream.on('data',function(buf){

    output = Buffer.concat([output,buf]);
    // flush any output that does not head match written
    if(written.length) {
  
      var flush = -1,match = 0;
      for(var i=0;i<output.length;++i){
        if(output[i] == written[match]) {
          match++;
          if(match == written.length){
            // i have a full match

            // -  DONT CLEAN

            //var cleaned = [];
            // before match
            //cleaned.push(output.slice(0,i-match+1));
            // after match
            //cleaned.push(output.slice((i-match)+(written.length+1)));

            // call command recieved callback.

            clearTimeout(writtenTimer);
            s.queue(output);

            // reset buffers all of written has been echoed back we know all of output can be sent now.
            written = new Buffer(0);
            output = new Buffer(0);
            match = 0;

            //s.queue(Buffer.concat(cleaned));
            break;
          }
        } else {
        match = 0;// reset match index
        }
      }
  
      // only output non matching part of output buffer
      if(match > 0){
        // i have non matching chars i can flush
        if(output.length-match > 0){
          //
          var chunk = output.slice(0,output.length-match);
          output = output.slice(output.length-match);

          s.queue(chunk);
          
        } 
        return run(); 
      }
    }

    // no match to written in this output
    if(output.length) {
      var chunk = output;
      output = new Buffer(0);
      s.queue(chunk);
    }

    run();

  })

  stream.on('end',done).on('close',done).on('error',done);

  function done(){
    writing = false;
    written = false;
    s.end();
  }
    
  function run(){ 
    
    // only send one write at a time even if less than max is pending.
    // ** the writes may be echoed back sepparately if in distinct writes even if less than max. esp in a world where writes may be async
    if(writing.length && !written.length){
      written = writing.slice(0,max);
      
      clearTimeout(writtenTimer);
      writtenTimer = setTimeout(function(){
        if(written.length) {
          // timeout.
          written = new Buffer(0);
          run();
        }
      },timeout);

      if(writtenTimer.unref) writtenTimer.unref();

      // this should not split up input \r\n
      var count = max;
      if(written[written.length] == "\r".charCodeAt(0)) {
        count--;
        written = writing.slice(0,count);
      }

      // remove data from queue
      writing = writing.slice(count);

      // send the data!
      stream.write(written);

    } else if(ended && !writing.length){
      s.queue(null);
    }
    // output from bitlash transforms \n into \r\n we still write exactly what you send but compare what we expect.
    //var normalized = normalizeLineEndings(data);
  }

  s.reset = function(){
    writing = new Buffer(0);
    written = new Buffer(0);
  }


  return s;
}


function normalizeLineEndings(buf){

  var lastc;
  var chars = [];
  var r = "\r".charCodeAt(0);

  for(var i=0;i<buf.length;++i){
    if(buf[i] == "\n" && lastc != "\r"){
      chars.push(r)
    }
    chars.push(buf[i]);
    lastc = buf[i];
  }

  return new Buffer(chars);

}



