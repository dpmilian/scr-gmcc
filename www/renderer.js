// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

var camera, controls, scene, renderer;
var geometry, material, pod;
var sky, cubeCamera;

var sfcGroup, depthGroup;

var parameters = {
    distance: 200,
    inclination: .5,
    azimuth: 1.35
};

// ------------------------------

function rad(degrees){
    return Math.PI / 180 * degrees;
}

function deg(rad){
    return rad /Math.PI * 180;
}

var curveObject = null;
// var cnt = 0;
const ZOFFSET = -10;
const ZRANGE = 50;

function updateCurve(theturns){


    if (curveObject != null) scene.remove(curveObject);

    var pointGeometry = new THREE.BufferGeometry();

    // theturns = -3.4 + cnt;
    // cnt+= .01;
    // console.log("Turns at " + theturns);
    if (theturns == 0) return;

    var absturns = Math.abs(theturns);
    var sign = theturns / absturns;
    var ps = [];


 
    var ppercurve = 500 * absturns;
    if (ppercurve < 200) ppercurve = 200;
    var tstep =  Math.PI *absturns / (ppercurve);
    var zstep = ZRANGE /ppercurve;
    
    var i = 0;

    for (var i = 0, t = 0, z = 0; i < ppercurve; i++, t += tstep, z += zstep) {
        ps.push(
            sign *10*Math.sin(t)*Math.cos(t),
            z + ZOFFSET,
            sign * 10 * Math.sin(t) * Math.sin(t)
        );
    }
        // console.log("TSTEP " + tstep + ", " + i + " steps vs " + (theturns/ tstep));
    pointGeometry.addAttribute('position', new THREE.Float32BufferAttribute(ps,3));
 // Create the final object to add to the scene
    // var curve = new MeshLine();
    // curve.setGeometry(new THREE.Float32BufferAttribute(ps,3), function(p){ return 10;});

    var mlmaterial = new THREE.LineBasicMaterial({
        color: 0xFF6000,
        linewidth: 3
    });
    // curveObject = new THREE.Mesh(curve, mlmaterial);
    curveObject = new THREE.Line( pointGeometry, mlmaterial);

    scene.add(curveObject);
}

var font = null;
var depthGroup;
var depth;
var depthtext = null;

function init() {
    
    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, .1, 20000);
    
    camera.position.set(-35,30,85);
    camera.lookAt(new THREE.Vector3(-35,22,0));

    light = new THREE.DirectionalLight( 0xffffff, 1 );
    
    scene.add( light );

    var bgload = new THREE.TextureLoader();
    bgload.load('textures/beach.jpg' , function(map){
        map.anisotropy = renderer.capabilities.getMaxAnisotropy();
        map.magFilter = THREE.LinearFilter;
        map.minFilter = THREE.LinearMipMapLinearFilter;
        scene.background = map;  
    });

    var loader = new THREE.FontLoader();

    loader.load( 'fonts/droid_sans_regular.typeface.json', function(afont){
        font = afont;
    });

    geometry = new THREE.CylinderGeometry( 20, 20, 2, 64 );
    material = new THREE.MeshPhongMaterial({
        opacity: .5,
        premultipliedAlpha: true,
        transparent: true,
        color: 0xFF6000
            } );
    pod = new THREE.Mesh(geometry, material);
    pod.position.set(0 , ZOFFSET -1, 0);
    
    thing = new THREE.Group();
    thing.add(pod);

    grid = new THREE.PolarGridHelper(25, 6, 4, 128, 0x222, 0x449);
    grid.position.set(0, ZOFFSET, 0);
    thing.add(grid);


    var panelg = new THREE.PlaneGeometry(80, 100);
    panel = new THREE.Mesh(panelg, material);
    scene.add(panel);
    
    sfcGroup = new THREE.Group();
    var sfcg = new THREE.CircleGeometry(20, 64);
    // sfcg.vertices.shift();
    var sfcm = new THREE.MeshBasicMaterial({
        color: 0x449,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.4
    });
    var sfc = new THREE.Mesh(sfcg, sfcm);
    sfc.rotation.x = Math.PI/2;
  
    sfcGroup.position.set(0, ZRANGE + ZOFFSET-1, 0);
    sfcGroup.add(sfc);
    scene.add(sfcGroup);

    var depthg = new THREE.CircleGeometry(20, 64);
    depthg.vertices.shift();
    
    var depthsfcm = new THREE.LineBasicMaterial({
        color: 0x449,
        transparent: true,
        opacity: 0.8,
        linewidth: 2
    });
    var depthsfc = new THREE.LineLoop(depthg, depthsfcm);
    // sfc.rotation.set(0, Math.Pi/2, 0);
    depthsfc.rotation.x = Math.PI/2;
    
    depthGroup = new THREE.Group();
    depthGroup.position.set(0, ZRANGE + ZOFFSET -1);
    scene.add(depthGroup);

    depthGroup.add(depthsfc);

    var dir = new THREE.Vector3( 0, 0, -1);
    //normalize the direction vector (convert to vector of length 1)
    dir.normalize();
    var origin = new THREE.Vector3( 0, ZOFFSET, 0 );
    var length = 30;
    var hex = 0xff2234;
    var arrowHelper = new THREE.ArrowHelper( dir, origin, length, hex );
    thing.add( arrowHelper );
    scene.add(thing);
    
    // var textureLoader2 = new THREE.TextureLoader();
    // textureLoader2.load( "textures/ss.jpg", function ( map ) {
    //     map.anisotropy = renderer.capabilities.getMaxAnisotropy();
    //     map.magFilter = THREE.LinearFilter;
    //     map.minFilter = THREE.LinearMipMapLinearFilter;


    //     // material.displacementMap = map;
    //     material.map = map;
    //     material.needsUpdate = true;
    // } );



   

    var spotLight = new THREE.SpotLight ( 0xFFFFFF);
    spotLight.position.set( 0, 5, 2 );
    spotLight.angle = 2;
    spotLight.penumbra = 11;
    scene.add( spotLight );

 
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true
    });
    renderer.setPixelRatio( window.devicePixelRatio );
    // renderer.setClearColor(0x000000, 0);
    // renderer.shadowMap.enabled = true;

    var viewdiv = $("#view");
    renderer.setSize(viewdiv.width(), viewdiv.height(), false);

    viewdiv[0].appendChild(renderer.domElement);

    // controls = new THREE.OrbitControls(camera, viewdiv[0]);
    // controls.update();
    // camera.update();
    // controls.maxPolarAngle = Math.PI * 0.25;
    // controls.target.set( 0, 10, 10 );
    // controls.minDistance = 40.0;
    // controls.maxDistance = 200.0;
    // controls.update();

    renderCSS3D();

    window.addEventListener( 'resize', onWindowResize, false );

    // updateSun();


}

// ------------------------------

// function updateSun() {
//     var theta = Math.PI * ( parameters.inclination - 0.5 );
//     var phi = 2 * Math.PI * ( parameters.azimuth - 0.5 );
//     light.position.x = parameters.distance * Math.cos( phi );
//     light.position.y = parameters.distance * Math.sin( phi ) * Math.sin( theta );
//     light.position.z = parameters.distance * Math.sin( phi ) * Math.cos( theta );
//     sky.material.uniforms[ 'sunPosition' ].value = light.position.copy( light.position );
//     // water.material.uniforms[ 'sunDirection' ].value.copy( light.position ).normalize();

//     cubeCamera.update( renderer, sky );
// }

// ------------------------------

function onWindowResize(){

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    var viewdiv = $("#view");
    renderer.setSize(viewdiv.width(), viewdiv.height(), false);
    cssRenderer.setSize(viewdiv.width(), viewdiv.height(), false);

}
// ------------------------------

function polarToCartesian(r, phi) {

    var pos = { 'x': 0, 'y': 0 , 'z': 0};

    pos.x = r * Math.cos((phi + 90) * Math.PI/180);
    pos.y = r * Math.sin((phi + 90) * Math.PI/180);

    return pos;
}

var thedepth = -1;

var textm = new THREE.MeshBasicMaterial({
    color: 0x222299,
    transparent: true,
    opacity: 0.8
});

const MAX_DEPTH = 6000;
const DEPTH_EXPANDER = 500;
const LOG_MAX_DEPTH = Math.log10(MAX_DEPTH/DEPTH_EXPANDER + 1);

function updateDepth(newdepth){

    thedepth = newdepth;

    if (thedepth > 1) zdepth = - ZRANGE * Math.log10(thedepth/DEPTH_EXPANDER + 1) / LOG_MAX_DEPTH;
    else zdepth = 0;

    depthGroup.position.set(0, ZRANGE + zdepth + ZOFFSET - 1, 0);
    if (font == null){
        console.log("Font not loaded yet");
        return;
    } 
    if (depthtext != null) depthGroup.remove(depthtext);

    var sdepth = thedepth + ' m';
    
    var textg = new THREE.TextGeometry(sdepth, {
		font: font,
		size: 1.5,
		height: .1,
		curveSegments: 48
    } );

    depthtext = new THREE.Mesh(textg, textm);
    var pos = polarToCartesian(21, 40);
    
    // depthtext.rotation.set(0, -Math.atan2(pos.y,-pos.x),0);
    depthtext.rotation.set(0, -Math.PI/6,0);
    depthtext.position.set(-pos.x, 0, pos.y);
    // depthGroup.rotation.set(0, Math.PI /10, 0);

     depthGroup.add(depthtext);
}

// ------------------------------

function animate() {

    setTimeout(function () {

        requestAnimationFrame(animate);

    }, 1000 / 60);

    // water.material.uniforms[ 'time' ].value += 1.0 / 60.0;
    if (turns) updateCurve(turns.theturns);
    // depth.thedepth = 1000;
    if (depth && depth.thedepth != thedepth) updateDepth(depth.thedepth);
    renderer.render(scene, camera);
    cssRenderer.render(cssScene,camera);

}



// ------------------------------

init();
animate();

