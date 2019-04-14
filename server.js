const SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline');

var validPass = "romeo";

var status = {
  'comms_connected': false,
  'mode': 'R',
  'port': '',
  'baudrate': '',
  'available_ports': [],
  'dive': 1,
  'rovname': 'ROMEO',
  'releasting': 0,
  'northing':0,
  'vessel': {
    'n': 0,
    'e': 0,
    'depth': -1
  },
  'clump': {
    'n': 0,
    'e': 0,
    'depth': 0
  },
};

var clump_history = [];

var pos = {
  'hdg': 0,
  'turns': 0,
  'cnt': 0
};

var comms = {

  wire: null,
  parser: null,

  connect: function(port, baudrate){
    console.log("Connect to serial port " + port + " @ " + baudrate + " bps");
    this.wire = new SerialPort(port, {baudRate: baudrate});
    this.parser = this.wire.pipe(new Readline());
    this.parser.on('data', this.recvd);
  },

  disconnect: function(){

  },

  recvd: function(data){
    // received data from serial port
    var fsep = RegExp("\\s+");
    var fields = data.split(fsep);

    var ok = fields[2];

    // console.log("Received serial");
    // console.log(fields);
    var dhdg = Number(fields[1]);
    
    if (ok != "1") return;
    
    if (status.mode != 'A'){
      console.log("Don't know if it is in the right mode, just update the heading and shrug");
      pos.hdg = dhdg;
    } else {
      pos.hdg = (pos.hdg + dhdg) % 360;
    if (pos.hdg < 0) pos.hdg += 360;
    // console.log("Dhdg: " + dhdg + ", absolute: " + pos.hdg);
    pos.turns += dhdg /360;
    pos.cnt++;

    

    if (pos.cnt % 10 == 0){     // Send to interface every 500ms (20 samples)
      if (status.mode != 'A') console.log("Wrong mode, won't log data in absolute heading values (still sending it to viewer)");
      else logGyroData(
        pos.hdg.toFixed(4),
        pos.turns.toFixed(4), 
        pos.cnt, 
        status.dive, 
        status.rovname, 
        status.clump.n, 
        status.clump.e, 
        status.clump.depth);
      // console.log("[" + pos.cnt + "] Calculated heading: " + pos.hdg + ", total rotation: " + pos.turns);


      var posmsg = {
        'cmd': "GYRO",
        'pos': pos,
        'clump': status.clump,
        'dive': status.dive
      };
      var sposmsg = JSON.stringify(posmsg);

      wsclients.forEach(function(ws){
        ws.send(sposmsg);
      });
    }
    

    }

  },

  send: function(data){
    this.wire.write(data);
  },

  get_ports: function(){
    SerialPort.list(function(err, ports){
      ports.forEach(function(port){
        if (port.vendorId){
          status.available_ports.push(port.comName);
          console.log(port);
        }
        
      });
    });
  }
}

comms.get_ports();

// ### DEBUG
// comms.connect('/dev/ttyUSB0', 38400);


// Websocket server
var WSServer = require('ws').Server;
wss = new WSServer({port: 41148});

var wsclients = [];

wss.on('connection', function(ws){

  wsclients.push(ws);

  // ***********************

  ws.on('message', function(msg){
    console.log("Received message from client: " + msg);
    var sender = this;
   parseClientCommand(sender, JSON.parse(msg));
  });

  // ***********************

  ws.on('close', function(msg){
    console.log('Client has disconnected');
    wsclients = wsclients.filter(function(value, index, arr){
      return (value != ws);
    });
    console.log('Remaining clients: ' + wsclients.length);
  });
});

  // ***********************
  // ***********************
function parseClientCommand(sender, msg){

  var pass = msg.pass;
  if (pass != validPass && msg.cmd != "STS"){
    console.log("Admin command sent without admin password, ignore");
  
  } else {
    switch(msg.cmd){

      // ******
      case "PORT":
        status.port = msg.port;
        status.baudrate = msg.baudrate;
        status.comms_connected = true;

        comms.connect(status.port, status.baudrate);
        break;

      // ******
      case "ZERO":
        if (status.comms_connected){
          comms.send("Z");
          pos.hdg = 0;
          pos.turns = 0;
        
        } else {
          console.log("Sent Zero request but comms not connected");
        }
        break;

      // ******
      case "MODE":
        if (status.comms_connected){
          status.mode = 'A';
          comms.send(status.mode);
          
        } else {
          console.log("Sent A Mode request but comms not connected");
        }
        break;
      // ******
      case "DIVE":
        status.dive = msg.dive;
    }
  }

  hello = {
    'cmd': 'STS',
    'status': status
  }
  sender.send(JSON.stringify(hello));
  
}


////////////////////////////////////////////////////
// DB Logging - influxdb
const Influx = require('influx');

const influx = new Influx.InfluxDB({
  host: 'localhost',
  database: 'umbilical_conditioning_magellan_db',
  schema: [
    {
      measurement: 'gyro',
      fields: {
        hdg: Influx.FieldType.FLOAT,
        turns: Influx.FieldType.FLOAT,
        cnt: Influx.FieldType.INTEGER,
        easting: Influx.FieldType.FLOAT,
        northing: Influx.FieldType.FLOAT,
        depth: Influx.FieldType.FLOAT
      },
      tags: [
        'rov',
        'dive'
      ]
    }
  ]
 });

 influx.createDatabase('umbilical_conditioning_magellan_db');

 function logGyroData(hdg, turns, cnt, divenum, rovname, ee, nn, dd){
  
  influx.writePoints([
    {
      measurement: 'gyro',
      tags: { rov: rovname, dive: divenum },
      fields: { hdg: hdg, cnt: cnt, turns: turns, easting: ee, northing: nn, depth: dd},
    }
  ]);
 }

////////////////////////////////////////////////////
// Winfrog sockets
const net = require('net');

const NAV_SERVER = '192.168.42.111';
const VESSEL_PORT = 5777;
const CLUMP_PORT = 1701;
const POSITION_AVERAGE_WINDOW = 5;
  
var vessel_buffer = "";
var clump_buffer = "";

///////////////////////

function parse_nav_buffer(buffer){

  var pos = {
    'n': -1,
    'e': -1,
    'depth': -1
  };

  // console.log("Buffer @ " + buffer);
  var ix = buffer.lastIndexOf("$scr");
  var last_data = buffer.substr(ix);

  var ixlfcr = last_data.indexOf("\r\n"); 
  if (ixlfcr != -1){
    last_data = last_data.substring(0, ixlfcr);
    // console.log("Full position " + last_data);
    buffer = buffer.substr(ixlfcr + 2);
    // console.log("\tRemains: " + buffer);
    var fields = last_data.split(",");
    var l = fields.length;

    if (l >= 2) pos.n = parseFloat(fields[1]);
    if (l >= 3) pos.e = parseFloat(fields[2]);
    if (l >= 4) pos.depth = parseFloat(fields[3]);
  }

  return pos;
}

///////////////////////

function average_positions(history){

  var pos = {
    'n': 0,
    'e': 0,
    'depth': 0
  };

  var l = history.length;

  history.forEach(function(pos_ix){
    pos.n += pos_ix.n / l;
    pos.e += pos_ix.e / l;
    pos.depth += pos_ix.depth / l;
    // console.log("pos_ix.depth = " + pos_ix.depth);
  });

  return pos;
}

///////////////////////

  vessel = net.connect(VESSEL_PORT, NAV_SERVER, function () {
    console.log('Connected to VESSEL port');

    this.on('data', function (data) {
      vessel_buffer += data;
      var pos = parse_nav_buffer(vessel_buffer);
     
      if (!isNaN(pos.n) && (pos.n != -1)){
        status.vessel = pos;
      } 
      // else console.log("Incomplete vessel position " + vessel_buffer);
      
    });

  });

  vessel.on('error', function(e){
    console.log("Error in connection" + e);
  });

  var romeo = net.connect(CLUMP_PORT, NAV_SERVER, function () {
    console.log('Connected to ROMEO port');

    this.on('data', function (data) {

      // console.log("Clump: " + data);
      clump_buffer += data;
      var pos = parse_nav_buffer(clump_buffer);
      if (!isNaN(pos.n) && (pos.n != -1)){
        // console.log("New Romeo position");
        // console.log(pos);
        clump_history.push(pos);
        if (clump_history.length > POSITION_AVERAGE_WINDOW) clump_history.pop();
        var abs_clump = average_positions(clump_history);
        
        // view/ log only relative positions
        status.clump.n = status.vessel.n - abs_clump.n;
        status.clump.e = status.vessel.e - abs_clump.e;
        status.clump.depth = abs_clump.depth;

        console.log("Clump position: ");
        console.log(status.clump);
      } 
      // else console.log("Incomplete clump position " + clump_buffer);
    });
  });

  romeo.on('error', function(e){
    console.log("Error in connection" + e);
  });


////////////////////////////////////////////////////
// Website
const express = require('express');
var app = express();


app.use(express.static('www'));

app.get('/cmd', function (req, res) {
  res.send('Hello World!');
});
 
app.listen(8000, function () {
  console.log('MaGyCC Server listening on port 8000');
});