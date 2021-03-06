var hdg, turns, depth;

var ws;
// event emmited when connected
function wsonopenhandler (event) {
    console.log('websocket is connected ...')
    // sending a send event to websocket server

    cmd = {
        'cmd': "STS"
    };
    ws.send(JSON.stringify(cmd));
}

// event emmited when receiving message 
function wsonmessagehandler(event){
    // console.log("Server says :");
    // console.log(event.data);
    msg = JSON.parse(event.data);

    var cmd = msg.cmd;
    switch(cmd){
        case 'STS':
            var status = msg.status;
            var plist = $("#port-list");
            plist.empty();
            status.available_ports.forEach(function(port){
                plist.append('<a href="#" class="comm-option w3-bar-item w3-button">'+port+'</a>');
            });

            $(".comm-option").on("click", function(e){
                var cmd = {
                    'cmd': "PORT",
                    'port': $(this).text(),
                    'pass': $("#pass").val(),
                    'baudrate': 38600                
                };
                ws.send(JSON.stringify(cmd));
        
            });

            $("button#set-dive").on("click", function(e){
                var cmd = {
                    'cmd': "DIVE",
                    'dive': dive.thedive,
                    'pass': $("#pass").val(),
                };
                ws.send(JSON.stringify(cmd));
            });
            $("button#set-dive").removeClass("active");
            var divenum = status.dive;
            console.log("Status sets dive number to " + divenum);
            dive.find(".val").text(divenum);
            dive.thedive = divenum;

            var pconnected = $("#connect");
            if (status.comms_connected){
                pconnected.text("CONNECTED");
                pconnected.addClass("active");
                pconnected.connected = true;
                dive.addClass("active");
            } 
            else {
                pconnected.text("DISCONNECTED")
                pconnected.connected = false;
            }

            var pmode = $("#mode");
            pmode.find(".val").text(status.mode);

            var pcomport = $("#comport");
            if (status.port != ""){
                pcomport.text("Serial Port: " + status.port.susbstr(status.port.lastIndexOf("/")));
            }

            break;
        case 'GYRO':
            var pos = msg.pos;
            var clump = msg.clump;
            var divenum = msg.dive;

            hdg.find(".val").text(pos.hdg.toFixed(2));
            hdg.thehdg = pos.hdg;
            turns.find(".val").text(pos.turns.toFixed(2));
            turns.theturns = pos.turns;
            if (pos.turns < 0){
                turns.find(".dir").text("TURNS TO PRT");
            } else if (pos.turns > 0){
                turns.find(".dir").text("TURNS TO STB");
            } else turns.find("dir").text("");
            depth.find(".val").text(clump.depth.toFixed(2));
            depth.thedepth = clump.depth;
            dive.find(".val").text(divenum);
            dive.thedive = divenum;


            // and update pod orientation
            thing.rotation.set(0, -rad(pos.hdg), 0);
            // grid.rotation.set(0, rad(pos.hdg), 0);

        break;

    };
}


// ** ONLOAD EVENT FOR ACTIVATING EVENTS IS HERE!!!! *********************

window.onload = function(){

    var pass = $("#pass");
    pass.on("click", function(e){
        this.value = "";
    });
    // pass.on("blur", function(e){
    //     if (this.value === "") this.value= "";
    // });
    pass.on("keydown", function(e){
        e.stopPropagation();
    });

    $("#mode").on("click", function(e){
        var cmd = {
            cmd: "MODE",
            pass: pass.val()
        };
    
        ws.send(JSON.stringify(cmd));

    });

    $("#zero").on("click", function(e){
        var cmd = {
            cmd: "ZERO",
            pass: pass.val()
        };    
        ws.send(JSON.stringify(cmd));

    });

    hdg = $("#hdg");
    hdg.thehdg = 0;
    turns = $("#turns");
    turns.theturns = 0;
    depth = $("#depth");
    depth.thedepth = 0;
    dive = $("#dive");
    dive.thedive = 0;

    dive.find("button").on("click", function(){

        var go = $(this).attr('go');
        console.log("GO " + go);
        if ($("#connected").connected) return;

        if (go == "up"){
            dive.thedive++;
            dive.find(".val").text(dive.thedive);
        } else if (go == "down"){
            if (dive.thedive > 0) dive.thedive--;
            else return;
            dive.find(".val").text(dive.thedive);
        } 
        $("button#set-dive").addClass("active");
    });
    ws = new WebSocket('ws://'+ location.hostname +':41148');

    ws.onopen = wsonopenhandler;
    ws.onmessage = wsonmessagehandler;

}