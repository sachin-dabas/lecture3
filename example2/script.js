import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.124.0/build/three.module.js'
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.124.0/examples/jsm/controls/OrbitControls.js'
import { Rhino3dmLoader } from 'https://cdn.jsdelivr.net/npm/three@0.124.0/examples/jsm/loaders/3DMLoader.js'
import rhino3dm from 'https://cdn.jsdelivr.net/npm/rhino3dm@0.15.0-beta/rhino3dm.module.js'
import { RhinoCompute } from 'https://cdn.jsdelivr.net/npm/compute-rhino3d@0.13.0-beta/compute.rhino3d.module.js'

// reference the definition
const definitionName = 'vassel.gh'

// listen for slider change events
const density_slider = document.getElementById( 'density' )
density_slider.addEventListener( 'mouseup', onSliderChange, false )
const radius_slider = document.getElementById( 'radius' )
radius_slider.addEventListener( 'mouseup', onSliderChange, false )
const rotate_slider = document.getElementById( 'rotate' )
rotate_slider.addEventListener( 'mouseup', onSliderChange, false )

const downloadButton = document.getElementById("downloadButton")
downloadButton.onclick = download

// set up loader for converting the results to threejs
const loader = new Rhino3dmLoader()
loader.setLibraryPath( 'https://cdn.jsdelivr.net/npm/rhino3dm@0.15.0-beta/' )

// create a few variables to store a reference to the rhino3dm library and to the loaded definition
let rhino, definition, doc

rhino3dm().then(async m => {
    rhino = m

    // local 
    //RhinoCompute.url = 'http://localhost:8081/' // Rhino.Compute server url

    // remote
    RhinoCompute.url = 'https://macad2021.compute.rhino3d.com/'
    RhinoCompute.apiKey = getApiKey() // needed when calling a remote RhinoCompute server

    // source a .gh/.ghx file in the same directory
    let url = definitionName
    let res = await fetch(url)
    let buffer = await res.arrayBuffer()
    definition = new Uint8Array(buffer)

    init()
    compute()
    animate()
})

async function compute() {

    // collect data

    // get slider values
    let density = document.getElementById('density').valueAsNumber
    let radius = document.getElementById('radius').valueAsNumber
    let rotate = document.getElementById('rotate').valueAsNumber

    // format data
    let param1 = new RhinoCompute.Grasshopper.DataTree('RH_IN:density')
    param1.append([0], [density])
    let param2 = new RhinoCompute.Grasshopper.DataTree('RH_IN:radius')
    param2.append([0], [radius])
    let param3 = new RhinoCompute.Grasshopper.DataTree('RH_IN:rotate')
    param3.append([0], [rotate])

    // Add all params to an array
    let trees = []
    trees.push(param1)
    trees.push(param2)
    trees.push(param3)

    // Call RhinoCompute

    const res = await RhinoCompute.Grasshopper.evaluateDefinition(definition, trees)

    console.log(res) 

    collectResults(res.values)

}

function collectResults(values) {

    // clear doc
    if( doc !== undefined)
        doc.delete()

    // clear objects from scene
    scene.traverse(child => {
        if (!child.isLight) {
            scene.remove(child)
        }
    })

    console.log(values)
    doc = new rhino.File3dm()

    for ( let i = 0; i < values.length; i ++ ) {

        const list = values[i].InnerTree['{ 0; }']

        for( let j = 0; j < list.length; j ++) {

            const data = JSON.parse(values[i].InnerTree['{ 0; }'][j].data)
            const rhinoObject = rhino.CommonObject.decode(data)
            doc.objects().add(rhinoObject, null)

        }

    }

    const buffer = new Uint8Array(doc.toByteArray()).buffer
    loader.parse( buffer, function ( object ) 
    {

    //const meshMat = new THREE.MeshBasicMaterial( { vertexColors: true })
    const wireframeMat = new THREE.LineBasicMaterial( { color: 'black' } )
    for (let i = 0; i < object.children.length; i++) {
    const child = object.children[i];
    if (child.isMesh) {
    // child.material = meshMat
    const geo = new THREE.WireframeGeometry(child.geometry)
    const wireframe = new THREE.LineSegments(geo, wireframeMat)
    child.add(wireframe)

     }
    }
       
       
        scene.add( object )
        // hide spinner
        document.getElementById('loader').style.display = 'none'

        // enable download button
        downloadButton.disabled = false
    })


}

function onSliderChange() {

    // show spinner
    document.getElementById('loader').style.display = 'block'

    // disable download button
    downloadButton.disabled = true

    compute()

}

function getApiKey() {
    let auth = null
    auth = localStorage['compute_api_key']
    if (auth == null) {
        auth = window.prompt('RhinoCompute Server API Key')
        if (auth != null) {
            localStorage.setItem('compute_api_key', auth)
        }
    }
    return auth
}

// download button handler
function download () {
    let buffer = doc.toByteArray()
    saveByteArray("vassel.3dm", buffer)
}

function saveByteArray ( fileName, byte ) {
    let blob = new Blob([byte], {type: "application/octect-stream"})
    let link = document.createElement('a')
    link.href = window.URL.createObjectURL(blob)
    link.download = fileName
    link.click()
}

// BOILERPLATE //
// declare variables to store scene, camera, and renderer
let scene, camera, renderer

function init() {

    // Rhino models are z-up, so set this as the default
    THREE.Object3D.DefaultUp = new THREE.Vector3( 0, 0, 1 );

    // create a scene and a camera
    scene = new THREE.Scene()
    scene.background = new THREE.Color(1, 1, 1)
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    camera.position.z = - 30

    // create the renderer and add it to the html
    renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    document.body.appendChild(renderer.domElement)

    // add some controls to orbit the camera
    const controls = new OrbitControls(camera, renderer.domElement)

    // add a directional light
    const directionalLight = new THREE.DirectionalLight( 0xffffff )
    directionalLight.intensity = 2
    scene.add( directionalLight )

    const ambientLight = new THREE.AmbientLight()
    scene.add( ambientLight )

}

// function to continuously render the scene
function animate() {

    requestAnimationFrame(animate)
    renderer.render(scene, camera)

}
