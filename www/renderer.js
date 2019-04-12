// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

var camera, controls, scene, renderer;
var geometry, material, pod;
var sky, cubeCamera;

var parameters = {
    distance: 1000,
    inclination: 0.4,
    azimuth: 0.05
};

// ------------------------------

function rad(degrees){
    return Math.PI / 180 * degrees;
}

function deg(rad){
    return rad /Math.PI * 180;
}

var curveObject = null;
var cnt = 0;
var zoffset = -20;
var zrange = 40;

function updateCurve(theturns){


    if (curveObject != null) scene.remove(curveObject);

    var pointGeometry = new THREE.BufferGeometry();

    theturns = -3.4 + cnt;
    cnt+= .01;
    // console.log("Turns at " + theturns);
    if (theturns == 0) return;

    var absturns = Math.abs(theturns);
    var sign = theturns / absturns;
    var ps = [];


 
    var ppercurve = 500 * absturns;
    if (ppercurve < 200) ppercurve = 200;
    var tstep =  Math.PI *absturns / (ppercurve);
    var zstep = zrange /ppercurve;
    
    var i = 0;

    for (var i = 0, t = 0, z = 0; i < ppercurve; i++, t += tstep, z += zstep) {
        ps.push(
            sign *10*Math.sin(t)*Math.cos(t),
            z + zoffset,
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
var halfGroup;
var halftext = null;

function init() {
    
    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, .1, 20000);
    
    camera.position.set(0,15,50);
    
    light = new THREE.DirectionalLight( 0xffffff, 1 );
    
    scene.add( light );

    sky = new THREE.Sky();
    var uniforms = sky.material.uniforms;
    uniforms[ 'turbidity' ].value = 40;
    uniforms[ 'rayleigh' ].value = .5;
    uniforms[ 'luminance' ].value = 1;
    uniforms[ 'mieCoefficient' ].value = 0.005;
    uniforms[ 'mieDirectionalG' ].value = 0.7;

    
    cubeCamera = new THREE.CubeCamera( 0.1, 1, 512 );
    cubeCamera.renderTarget.texture.generateMipmaps = true;
    cubeCamera.renderTarget.texture.minFilter = THREE.LinearMipMapLinearFilter;
    scene.background = cubeCamera.renderTarget;
    

    var loader = new THREE.FontLoader();

    loader.load( 'fonts/droid_sans_regular.typeface.json', function(afont){
        font = afont;
    });
    var depthGroup = new THREE.Group();
    depthGroup.position.set(0, zrange + zoffset -1);
    scene.add(depthGroup);

    geometry = new THREE.CylinderGeometry( 20, 20, 2, 64 );
    material = new THREE.MeshPhongMaterial({
        opacity: .8,
        premultipliedAlpha: true,
        transparent: true,
        color: 0xFFFFFF,
        // emissive: 0xAAAAAA
    } );
    pod = new THREE.Mesh(geometry, material);
    pod.position.set(0 , zoffset -1, 0);
    // pod.rotation.set(0, Math.PI/2,0);
    
    thing = new THREE.Group();
    thing.add(pod);

    grid = new THREE.PolarGridHelper(20, 5, 4, 128, 0x222, 0x449);
    grid.position.set(0, zoffset, 0);
    thing.add(grid);


    var sfcg = new THREE.CircleGeometry(20, 64);
    sfcg.vertices.shift();
    var sfcm = new THREE.LineBasicMaterial({
        color: 0x449,
        linewidth: 1.2
    });
    var sfc = new THREE.LineLoop(sfcg, sfcm);
    // sfc.rotation.set(0, Math.Pi/2, 0);
    sfc.rotation.x = Math.PI/2;
    
    // var depthsfc = sfc.clone();
    // depthsfc.material.color = 0xFFFFFF;
    // depthGroup.add(depthsfc);

    sfc.position.set(0, zrange + zoffset-1, 0);
    scene.add(sfc);

    var halfg = new THREE.CircleGeometry(20, 64);
    halfg.vertices.shift();
    
    var halfsfc = new THREE.LineLoop(halfg, sfcm);
    // sfc.rotation.set(0, Math.Pi/2, 0);
    halfsfc.rotation.x = Math.PI/2;
    
    // var depthsfc = sfc.clone();
    // depthsfc.material.color = 0xFFFFFF;
    // depthGroup.add(depthsfc);

    halfGroup = new THREE.Group();
    halfGroup.add(halfsfc);
    halfGroup.position.set(0, zrange/2 + zoffset-1, 0);

    scene.add(halfGroup);



    var dir = new THREE.Vector3( 0, 0, -1);
    //normalize the direction vector (convert to vector of length 1)
    dir.normalize();
    var origin = new THREE.Vector3( 0, zoffset, 0 );
    var length = 30;
    var hex = 0xff2234;
    var arrowHelper = new THREE.ArrowHelper( dir, origin, length, hex );
    thing.add( arrowHelper );
    scene.add(thing);
    
    var textureLoader2 = new THREE.TextureLoader();
    textureLoader2.load( "textures/ss.jpg", function ( map ) {
        map.anisotropy = 8;
        map.repeat.set(4, 10);
        map.offset.set(-.8,-1.5);
        // material.displacementMap = map;
        material.map = map;
        material.needsUpdate = true;
    } );



   

    var spotLight = new THREE.SpotLight ( 0xFFFFFF);
    spotLight.position.set( 0, 4, 2 );
    spotLight.angle = 2;
    spotLight.penumbra = 11;
    scene.add( spotLight );

 
    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio( window.devicePixelRatio );
    // renderer.setClearColor(scene.fog.color, 1);
    // renderer.shadowMap.enabled = true;

    renderer.setSize(window.innerWidth, window.innerHeight);

    document.getElementById('view').appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera);
    // controls.maxPolarAngle = Math.PI * 0.25;
    // controls.target.set( 0, 10, 10 );
    // controls.minDistance = 40.0;
    // controls.maxDistance = 200.0;
    // controls.update();

    window.addEventListener( 'resize', onWindowResize, false );

    updateSun();


}

// ------------------------------

function updateSun() {
    var theta = Math.PI * ( parameters.inclination - 0.5 );
    var phi = 2 * Math.PI * ( parameters.azimuth - 0.5 );
    light.position.x = parameters.distance * Math.cos( phi );
    light.position.y = parameters.distance * Math.sin( phi ) * Math.sin( theta );
    light.position.z = parameters.distance * Math.sin( phi ) * Math.cos( theta );
    sky.material.uniforms[ 'sunPosition' ].value = light.position.copy( light.position );
    // water.material.uniforms[ 'sunDirection' ].value.copy( light.position ).normalize();

    cubeCamera.update( renderer, sky );
}

// ------------------------------

function onWindowResize(){

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    
    renderer.setSize( window.innerWidth, window.innerHeight);

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
    color: 0x111133,
    transparent: true,
    opacity: 0.8
});

function updateDepth(newdepth){

    thedepth = newdepth;
    
    if (font == null) return;
    if (halftext != null) halfGroup.remove(halftext);

    var sdepth = thedepth + ' m';
    
    var textg = new THREE.TextGeometry(sdepth, {
		font: font,
		size: 2,
		height: .1,
		curveSegments: 12
    } );

    halftext = new THREE.Mesh(textg, textm);
    halftext.position.set(20, 0, 5);
     halfGroup.add(halftext);
}
// ------------------------------

function animate() {

    setTimeout(function () {

        requestAnimationFrame(animate);

    }, 1000 / 60);

    // water.material.uniforms[ 'time' ].value += 1.0 / 60.0;
    if (turns) updateCurve(turns.theturns);
    if (depth && depth.thedepth != thedepth) updateDepth(depth.thedepth);

    renderer.render(scene, camera);

}



// ------------------------------

init();
animate();

