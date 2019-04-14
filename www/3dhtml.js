
var sturns = '<iframe src="http://'+location.hostname + ':3000/d-solo/W_CxxDgZz/magycc?tab=visualization&orgId=1&from=now-1h&to=now&refresh=1s&panelId=3" width="800" height="500" frameborder="0"></iframe>';
// var shdg = '<iframe src="http://'+location.hostname + ':3000/d-solo/W_CxxDgZz/magycc?orgId=1&refresh=1s&from=now-5s&to=now&panelId=2" width="200" height="200" frameborder="0"></iframe>'
var spass = '<div class="group"><input type="password" id="pass" required="required" value=""><label class="for" for="pass">admin password</label><div class="bar"></div></div>';
var simg = '<img class="logo" src="textures/logo_long.png" >';
var soptions1 = '<div class="group options"><div class="option" id="connect"> DISCONNECTED </div><div class="option" id="zero"> RESET TURNS </div><div class="option" id="mode"> GYRO MODE: <span class="val">R</span> </div></div>';
var soptions2 = '<div class="group options"><div class="option" id="hdg"> <span class="val">0</span>º</div><div class="option" id="turns"><span class="val">0</span> <span class="dir">PRT</span> </div><div class="option" id="depth"> <span class="val">0</span>m</div><div class="option static centered" id="dive"> <button go="down">-</button>Dive <span class="val">0</span><button go="up">+</button><button id="set-dive" go="go">GO</button></div></div>';
var scomms = '<div class="group options"><div class=" go-on w3-dropdown-hover"><button id="comport" class="w3-button w3-black">Select Com Port</button><div id="port-list" class="w3-dropdown-content w3-bar-block w3-border"><a href="#" class="w3-bar-item w3-button">---</a></div></div>';

var cssRenderer;
var cssScene;

function renderCSS3D(hmtl){

    cssRenderer = new THREE.CSS3DRenderer();
    cssRenderer.setSize($("#view").width(), $("#view").height(), false);

    cssScene = new THREE.Scene();

    var turns3d = new THREE.CSS3DObject($(sturns)[0]);

    turns3d.scale.set(.1,.1, .1);
    turns3d.position.set(-82, -5, -5);
    turns3d.rotation.set(0, Math.PI/8,0);
    
    cssScene.add(turns3d);

    panel.position = turns3d.position;
    panel.position.x -= 80;
    panel.position.y += 20;
    
    panel.rotation.y = turns3d.rotation.y;

    addPanelElement(simg, 80, -8);
    addPanelElement(spass, 80, 20);
    addPanelElement(soptions1, 15, 10);
    addPanelElement(soptions2, 45, 10);
    addPanelElement(scomms, 15, 30);

    document.getElementById('view').appendChild(cssRenderer.domElement);
    cssRenderer.domElement.style.position = 'absolute';
    cssRenderer.domElement.style.top = 0;
}

function addPanelElement(shtml, x, y, scalex = 1.0, scaley = 1.0){
    
    var el3d = new THREE.CSS3DObject($(shtml)[0]);
    el3d.scale.set(.12 * scalex,.12 * scaley,.12);
    el3d.position.set(-137 + x, 55 - y, -5);
    el3d.rotation.set(0, Math.PI/8,0);

    cssScene.add(el3d);
}