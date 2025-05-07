// WebXR Boids Demo
import Flock from './flock.js';
import HandTracking from './hand-tracking.js';
import { initMenu } from './menu.js';
import VRMenu from './vr-menu.js';

// Check if WebXR is available
if (navigator.xr === undefined) {
    document.body.innerHTML = '<h1>WebXR Not Available</h1><p>This browser does not support WebXR.</p>    <a href="http://localhost:8080/webxr-boids/index.html?_ijt=tivnkln42pbsq2dtpe5ndv0vl4&_ij_reload=RELOAD_ON_SAVE">Webstorm url</a>\n';
    throw new Error('WebXR not available');
}

// Three.js variables
let camera, scene, renderer;
let controller;
let vrButton;

// Boids simulation
let flock;

// Hand tracking
let handTracking;
let xrReferenceSpace;

// Pinch interaction
let pinchMarkers = {
    left: null,
    right: null
};

// Track attraction points for each hand
let attractionPoints = {
    left: null,
    right: null
};

// VR Menu
let vrMenu;

// Initialize the scene
init();

// Setup animation loop
animate();

function init() {
    // Get DOM elements
    const canvas = document.getElementById('canvas');
    vrButton = document.getElementById('vr-button');

    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x505050);

    // Create camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.6, 3);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1).normalize();
    scene.add(directionalLight);

    // Floor removed as requested

    // Add some objects to the scene
    addObjects();

    // Create renderer
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;

    // Add orbit controls for non-VR viewing
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.6, 0);
    controls.update();

    // Set up VR button
    vrButton.addEventListener('click', onVRButtonClick);

    // Check if VR is supported
    navigator.xr.isSessionSupported('immersive-vr').then((supported) => {
        vrButton.disabled = !supported;
    });

    // Handle window resize
    window.addEventListener('resize', onWindowResize);

    // Add keyboard controls for adjusting hand position
    window.addEventListener('keydown', onKeyDown);
}

function addObjects() {
    // Create a boundary sphere to visualize the boids' boundaries
    const boundaryGeometry = new THREE.SphereGeometry(5, 32, 16);
    const boundaryMaterial = new THREE.MeshBasicMaterial({
        color: 0x444444,
        wireframe: true,
        transparent: true,
        opacity: 0.1
    });
    const boundarySphere = new THREE.Mesh(boundaryGeometry, boundaryMaterial);
    boundarySphere.position.set(0, 1.5, 0);
    scene.add(boundarySphere);

    // Initialize the boids flock with fewer boids for better performance
    flock = new Flock(scene, 30);

    // Initialize the floating menu with the flock instance
    initMenu(flock);
}

function onVRButtonClick() {
    // Request a WebXR session with hand tracking
    navigator.xr.requestSession('immersive-vr', {
        optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking']
    }).then(onSessionStarted).catch(error => {
        console.error('Error starting VR session:', error);
        document.getElementById('hand-tracking-status').textContent =
            'Hand tracking status: Error starting VR session - ' + error.message;
    });
}

function onSessionStarted(session) {
    session.addEventListener('end', onSessionEnded);

    renderer.xr.setSession(session);
    vrButton.textContent = 'Exit VR';
    vrButton.removeEventListener('click', onVRButtonClick);
    vrButton.addEventListener('click', () => {
        session.end();
    });

    // Set up controllers
    controller = renderer.xr.getController(0);
    scene.add(controller);

    // VR menu disabled for now
    // vrMenu = new VRMenu(scene, flock, renderer);
    // vrMenu.setVisible(true);

    // Get reference space for hand tracking
    // Use 'local-floor' for better positioning of hands relative to the body
    session.requestReferenceSpace('local-floor').then((referenceSpace) => {
        xrReferenceSpace = referenceSpace;

        // Initialize hand tracking
        handTracking = new HandTracking(renderer, scene);
        handTracking.init();

        // Set up pinch callbacks
        setupPinchInteraction();
    }).catch(error => {
        console.warn('Error getting local-floor reference space:', error);

        // Fallback to 'local' reference space
        session.requestReferenceSpace('local').then((referenceSpace) => {
            console.log('Using local reference space as fallback');
            xrReferenceSpace = referenceSpace;

            // Initialize hand tracking
            handTracking = new HandTracking(renderer, scene);
            handTracking.init();
        });
    });
}

function onSessionEnded() {
    vrButton.textContent = 'Enter VR';
    vrButton.removeEventListener('click', onSessionEnded);
    vrButton.addEventListener('click', onVRButtonClick);
}

function onWindowResize() {
    // Only resize if not in VR mode
    if (!renderer.xr.isPresenting) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

// Handle keyboard controls for adjusting hand position
function onKeyDown(event) {
    // Only process if hand tracking is initialized
    if (!handTracking) return;

    const offset = handTracking.positionOffset;
    const step = 0.1; // Adjustment step size

    switch(event.key) {
        // Y-axis controls (up/down)
        case 'ArrowUp':
            handTracking.setPositionOffset(offset.x, offset.y + step, offset.z);
            break;
        case 'ArrowDown':
            handTracking.setPositionOffset(offset.x, offset.y - step, offset.z);
            break;

        // X-axis controls (left/right)
        case 'ArrowLeft':
            handTracking.setPositionOffset(offset.x - step, offset.y, offset.z);
            break;
        case 'ArrowRight':
            handTracking.setPositionOffset(offset.x + step, offset.y, offset.z);
            break;

        // Z-axis controls (forward/backward)
        case 'PageUp':
            handTracking.setPositionOffset(offset.x, offset.y, offset.z - step);
            break;
        case 'PageDown':
            handTracking.setPositionOffset(offset.x, offset.y, offset.z + step);
            break;

        // Reset position
        case 'Home':
            handTracking.setPositionOffset(0, 1.3, 0);
            break;
    }
}

function animate() {
    renderer.setAnimationLoop(render);
}

function render(timestamp, frame) {
    // Update the boids simulation
    if (flock) {
        flock.update();
    }

    // Update hand tracking if available
    if (handTracking && frame && xrReferenceSpace) {
        handTracking.update(frame, xrReferenceSpace);

        // Update pinch marker positions
        updatePinchMarkers();

        // Update pinch status in UI (do this regularly to handle any state changes)
        updatePinchStatusUI();

        // VR menu disabled for now
        // if (vrMenu && renderer.xr.isPresenting) {
        //     // Get hand controllers for menu interaction
        //     const leftHand = handTracking.getHandModel('left');
        //     const rightHand = handTracking.getHandModel('right');
        //     const leftPinching = handTracking.isPinching('left');
        //     const rightPinching = handTracking.isPinching('right');
        //
        //     // Update VR menu with hand positions and pinch states
        //     vrMenu.update(leftHand, rightHand, leftPinching, rightPinching);
        // }
    }

    // Render the scene
    renderer.render(scene, camera);
}

// Set up pinch interaction callbacks
function setupPinchInteraction() {
    // Create pinch marker geometries
    const markerGeometry = new THREE.SphereGeometry(0.02, 16, 16);

    // Create materials for the markers
    const leftMarkerMaterial = new THREE.MeshStandardMaterial({
        color: 0xffff00,
        emissive: 0x444400,
        roughness: 0.3,
        metalness: 0.8
    });

    const rightMarkerMaterial = new THREE.MeshStandardMaterial({
        color: 0xffff00,
        emissive: 0x444400,
        roughness: 0.3,
        metalness: 0.8
    });

    // Create marker meshes
    pinchMarkers.left = new THREE.Mesh(markerGeometry, leftMarkerMaterial);
    pinchMarkers.right = new THREE.Mesh(markerGeometry, rightMarkerMaterial);

    // Hide markers initially
    pinchMarkers.left.visible = false;
    pinchMarkers.right.visible = false;

    // Add markers to scene
    scene.add(pinchMarkers.left);
    scene.add(pinchMarkers.right);

    // Set up pinch callbacks
    handTracking.setOnPinchStart((handedness, position) => {
        console.log(`Pinch started with ${handedness} hand at`, position);

        // Show the marker at the pinch position
        pinchMarkers[handedness].position.copy(position);
        pinchMarkers[handedness].visible = true;

        // Update pinch status in UI
        updatePinchStatusUI();

        // Add attraction point for boids
        if (flock) {
            // Create a new attraction point at the pinch position
            attractionPoints[handedness] = flock.addAttractionPoint(position);

            // Visual feedback - change color of nearest boid
            if (flock.boids.length > 0) {
                const nearestBoid = findNearestBoid(position);
                if (nearestBoid) {
                    // Change the boid's color to yellow
                    nearestBoid.mesh.material.color.set(0xffff00);
                }
            }
        }
    });

    handTracking.setOnPinchEnd((handedness, position) => {
        console.log(`Pinch ended with ${handedness} hand at`, position);

        // Hide the marker
        pinchMarkers[handedness].visible = false;

        // Remove attraction point
        if (flock && attractionPoints[handedness]) {
            flock.removeAttractionPoint(attractionPoints[handedness]);
            attractionPoints[handedness] = null;
        }

        // Update pinch status in UI
        updatePinchStatusUI();
    });
}

// Update pinch marker positions
function updatePinchMarkers() {
    for (const handedness of ['left', 'right']) {
        if (handTracking.isPinching(handedness)) {
            const position = handTracking.getPinchPosition(handedness);
            if (position) {
                // Update marker position
                pinchMarkers[handedness].position.copy(position);

                // Update attraction point position if it exists
                if (flock && attractionPoints[handedness]) {
                    flock.updateAttractionPoint(attractionPoints[handedness], position);
                }
            }
        }
    }
}

// Find the nearest boid to a position
function findNearestBoid(position) {
    if (!flock || flock.boids.length === 0) return null;

    let nearestBoid = null;
    let nearestDistance = Infinity;

    for (const boid of flock.boids) {
        const distance = position.distanceTo(boid.position);
        if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestBoid = boid;
        }
    }

    // Only return the boid if it's within a reasonable distance (1 meter)
    return nearestDistance < 1.0 ? nearestBoid : null;
}

// Update the pinch status in the UI
function updatePinchStatusUI() {
    const pinchStatusElement = document.getElementById('pinch-status');
    if (!pinchStatusElement) return;

    // Check if either hand is pinching
    const leftPinching = handTracking && handTracking.isPinching('left');
    const rightPinching = handTracking && handTracking.isPinching('right');

    if (leftPinching && rightPinching) {
        pinchStatusElement.textContent = 'Pinch status: Both hands pinching';
        pinchStatusElement.style.color = '#ffff00'; // Yellow
    } else if (leftPinching) {
        pinchStatusElement.textContent = 'Pinch status: Left hand pinching';
        pinchStatusElement.style.color = '#00ffff'; // Cyan (left hand color)
    } else if (rightPinching) {
        pinchStatusElement.textContent = 'Pinch status: Right hand pinching';
        pinchStatusElement.style.color = '#ff00ff'; // Magenta (right hand color)
    } else {
        pinchStatusElement.textContent = 'Pinch status: No pinch detected';
        pinchStatusElement.style.color = '#ffffff'; // White
    }
}
