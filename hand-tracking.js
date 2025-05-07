// Hand tracking module for WebXR
class HandTracking {
    constructor(renderer, scene) {
        this.renderer = renderer;
        this.scene = scene;
        this.hands = {
            left: null,
            right: null
        };
        this.joints = {
            left: {},
            right: {}
        };

        // Position adjustment for hands
        this.positionOffset = new THREE.Vector3(0, 0, 0); // Adjust Y value to move hands up if needed

        // Hand joint meshes
        this.jointMaterials = {
            left: new THREE.MeshStandardMaterial({
                color: 0x00ffff,
                roughness: 0.1,
                metalness: 0.1
            }),
            right: new THREE.MeshStandardMaterial({
                color: 0xff00ff,
                roughness: 0.1,
                metalness: 0.1
            })
        };

        // Pinch materials (for visual feedback)
        this.pinchMaterials = {
            left: new THREE.MeshStandardMaterial({
                color: 0xffff00, // Yellow for pinch state
                roughness: 0.1,
                metalness: 0.1
            }),
            right: new THREE.MeshStandardMaterial({
                color: 0xffff00, // Yellow for pinch state
                roughness: 0.1,
                metalness: 0.1
            })
        };

        this.jointRadius = 0.008; // Size of the joint spheres
        this.jointGeometry = new THREE.SphereGeometry(this.jointRadius, 8, 8);

        // Hand models
        this.handModels = {
            left: new THREE.Group(),
            right: new THREE.Group()
        };

        // Add hand models to scene
        this.scene.add(this.handModels.left);
        this.scene.add(this.handModels.right);

        // Lines to connect joints
        this.handLines = {
            left: [],
            right: []
        };

        // Pinch detection
        this.pinchState = {
            left: false,
            right: false
        };
        this.pinchDistance = {
            left: Infinity,
            right: Infinity
        };
        this.pinchThreshold = 0.03; // Distance in meters to trigger pinch
        this.pinchReleaseThreshold = 0.05; // Distance in meters to release pinch (slightly larger to prevent flickering)

        // Pinch callbacks
        this.onPinchStart = null;
        this.onPinchEnd = null;

        // Status element
        this.statusElement = document.getElementById('hand-tracking-status');
    }

    // Initialize hand tracking
    init() {
        // Get XR reference space
        const session = this.renderer.xr.getSession();
        if (!session) {
            this.updateStatus('No XR session available');
            return;
        }

        // Check if hand tracking is supported
        // Note: supportedFeatures might not be available in all browsers
        this.updateStatus('Attempting to initialize hand tracking...');

        // We'll check for hand tracking support by trying to use it
        // rather than checking supportedFeatures which may not be available

        // Set up hand tracking inputs
        this.setupHandTracking();
    }

    // Set up hand tracking
    setupHandTracking() {
        const session = this.renderer.xr.getSession();
        if (!session) return;

        console.log('Setting up hand tracking...');
        this.updateStatus('Setting up hand tracking...');

        // Check if inputSources is available
        if (!session.inputSources) {
            console.warn('Input sources not available');
            this.updateStatus('Input sources not available - hand tracking may not work');
            return;
        }

        // Get hand input sources
        let handsDetected = false;
        for (const inputSource of session.inputSources) {
            if (inputSource.hand) {
                handsDetected = true;
                const handedness = inputSource.handedness; // 'left' or 'right'
                if (handedness === 'left' || handedness === 'right') {
                    console.log(`Detected ${handedness} hand`);
                    this.hands[handedness] = inputSource.hand;
                    this.createHandJoints(handedness);
                }
            }
        }

        if (!handsDetected) {
            console.log('No hands detected initially, waiting for hands to be detected');
            this.updateStatus('No hands detected yet - please show your hands to the headset');
        }

        // Listen for new input sources
        session.addEventListener('inputsourceschange', (event) => {
            console.log('Input sources changed');

            // Handle added input sources
            for (const inputSource of event.added) {
                if (inputSource.hand) {
                    const handedness = inputSource.handedness;
                    if (handedness === 'left' || handedness === 'right') {
                        console.log(`Hand added: ${handedness}`);
                        this.hands[handedness] = inputSource.hand;
                        this.createHandJoints(handedness);
                    }
                }
            }

            // Handle removed input sources
            for (const inputSource of event.removed) {
                if (inputSource.hand) {
                    const handedness = inputSource.handedness;
                    if (handedness === 'left' || handedness === 'right') {
                        console.log(`Hand removed: ${handedness}`);
                        this.hands[handedness] = null;
                        this.clearHandJoints(handedness);
                        this.updateStatus(`${handedness.charAt(0).toUpperCase() + handedness.slice(1)} hand lost`);
                    }
                }
            }
        });
    }

    // Create joints for a hand
    createHandJoints(handedness) {
        // Clear existing joints
        this.clearHandJoints(handedness);

        // Get the hand
        const hand = this.hands[handedness];
        if (!hand) return;

        console.log(`Creating joints for ${handedness} hand:`, hand);

        // Check if hand.joints exists and how to access it
        if (!hand.joints) {
            console.warn(`No joints property found on ${handedness} hand`);

            // Check if the hand itself is iterable (some implementations might use the hand object directly)
            if (hand.size && typeof hand.entries === 'function') {
                console.log(`Hand object appears to be iterable with size ${hand.size}`);

                // Create a temporary joints object
                hand.joints = {};

                // Try to iterate through the hand object
                try {
                    for (const [jointName, joint] of hand.entries()) {
                        hand.joints[jointName] = joint;
                    }
                    console.log(`Successfully extracted ${Object.keys(hand.joints).length} joints from hand object`);
                } catch (e) {
                    console.warn('Error iterating through hand:', e);
                }

                // If we still don't have joints, try another approach
                if (Object.keys(hand.joints).length === 0) {
                    this.updateStatus(`Hand detected but joints not accessible - trying alternative method`);

                    // Try to use the hand object itself as the joint source
                    console.log('Attempting to use hand object directly as joint source');
                    hand.joints = hand;
                }
            } else {
                // Try to use the hand object itself as the joint source
                console.log('Attempting to use hand object directly as joint source');
                hand.joints = hand;

                if (!hand.joints) {
                    this.updateStatus(`Hand detected but no joints available - hand tracking may not be fully supported`);
                    return;
                }
            }
        }

        // Define standard joint names to look for
        const jointNames = [
            'wrist',
            'thumb-metacarpal', 'thumb-phalanx-proximal', 'thumb-phalanx-distal', 'thumb-tip',
            'index-finger-metacarpal', 'index-finger-phalanx-proximal', 'index-finger-phalanx-intermediate', 'index-finger-phalanx-distal', 'index-finger-tip',
            'middle-finger-metacarpal', 'middle-finger-phalanx-proximal', 'middle-finger-phalanx-intermediate', 'middle-finger-phalanx-distal', 'middle-finger-tip',
            'ring-finger-metacarpal', 'ring-finger-phalanx-proximal', 'ring-finger-phalanx-intermediate', 'ring-finger-phalanx-distal', 'ring-finger-tip',
            'pinky-finger-metacarpal', 'pinky-finger-phalanx-proximal', 'pinky-finger-phalanx-intermediate', 'pinky-finger-phalanx-distal', 'pinky-finger-tip'
        ];

        // Try different ways to access joints
        let jointsToProcess = [];

        // Method 1: If hand.joints is a Map or has keys() method
        if (typeof hand.joints.keys === 'function') {
            try {
                jointsToProcess = Array.from(hand.joints.keys());
                console.log('Using hand.joints.keys() method');
            } catch (e) {
                console.warn('Error using hand.joints.keys():', e);
            }
        }
        // Method 2: If hand.joints is an object with properties
        else if (typeof hand.joints === 'object') {
            try {
                jointsToProcess = Object.keys(hand.joints);
                console.log('Using Object.keys(hand.joints)');
            } catch (e) {
                console.warn('Error using Object.keys(hand.joints):', e);
            }
        }

        // If we couldn't get joints from the hand object, use our predefined list
        if (jointsToProcess.length === 0) {
            console.log('Using predefined joint names');
            jointsToProcess = jointNames;
        }

        console.log(`Found ${jointsToProcess.length} joints to process`);

        // Create a joint mesh for each joint
        for (const jointName of jointsToProcess) {
            const joint = new THREE.Mesh(this.jointGeometry, this.jointMaterials[handedness]);
            joint.visible = false; // Hide until we have a valid pose
            joint.name = jointName; // Store joint name for reference

            // Add to hand model
            this.handModels[handedness].add(joint);

            // Store reference
            this.joints[handedness][jointName] = joint;
        }

        // Create lines to connect joints
        this.createHandLines(handedness);

        this.updateStatus(`${handedness.charAt(0).toUpperCase() + handedness.slice(1)} hand detected!`);
    }

    // Clear joints for a hand
    clearHandJoints(handedness) {
        // Remove all children from the hand model
        while (this.handModels[handedness].children.length > 0) {
            this.handModels[handedness].remove(this.handModels[handedness].children[0]);
        }

        // Remove all lines
        for (const line of this.handLines[handedness]) {
            this.scene.remove(line);
        }
        this.handLines[handedness] = [];

        // Clear joint references
        this.joints[handedness] = {};
    }

    // Create lines to connect joints
    createHandLines(handedness) {
        // Define connections between joints
        const connections = [
            // Thumb connections
            ['wrist', 'thumb-metacarpal'],
            ['thumb-metacarpal', 'thumb-phalanx-proximal'],
            ['thumb-phalanx-proximal', 'thumb-phalanx-distal'],
            ['thumb-phalanx-distal', 'thumb-tip'],

            // Index finger connections
            ['wrist', 'index-finger-metacarpal'],
            ['index-finger-metacarpal', 'index-finger-phalanx-proximal'],
            ['index-finger-phalanx-proximal', 'index-finger-phalanx-intermediate'],
            ['index-finger-phalanx-intermediate', 'index-finger-phalanx-distal'],
            ['index-finger-phalanx-distal', 'index-finger-tip'],

            // Middle finger connections
            ['wrist', 'middle-finger-metacarpal'],
            ['middle-finger-metacarpal', 'middle-finger-phalanx-proximal'],
            ['middle-finger-phalanx-proximal', 'middle-finger-phalanx-intermediate'],
            ['middle-finger-phalanx-intermediate', 'middle-finger-phalanx-distal'],
            ['middle-finger-phalanx-distal', 'middle-finger-tip'],

            // Ring finger connections
            ['wrist', 'ring-finger-metacarpal'],
            ['ring-finger-metacarpal', 'ring-finger-phalanx-proximal'],
            ['ring-finger-phalanx-proximal', 'ring-finger-phalanx-intermediate'],
            ['ring-finger-phalanx-intermediate', 'ring-finger-phalanx-distal'],
            ['ring-finger-phalanx-distal', 'ring-finger-tip'],

            // Pinky finger connections
            ['wrist', 'pinky-finger-metacarpal'],
            ['pinky-finger-metacarpal', 'pinky-finger-phalanx-proximal'],
            ['pinky-finger-phalanx-proximal', 'pinky-finger-phalanx-intermediate'],
            ['pinky-finger-phalanx-intermediate', 'pinky-finger-phalanx-distal'],
            ['pinky-finger-phalanx-distal', 'pinky-finger-tip'],

            // Palm connections
            ['index-finger-metacarpal', 'middle-finger-metacarpal'],
            ['middle-finger-metacarpal', 'ring-finger-metacarpal'],
            ['ring-finger-metacarpal', 'pinky-finger-metacarpal']
        ];

        // Create a line for each connection
        for (const [joint1Name, joint2Name] of connections) {
            // Check if both joints exist
            if (!this.joints[handedness][joint1Name] || !this.joints[handedness][joint2Name]) {
                continue;
            }

            // Create line geometry
            const lineGeometry = new THREE.BufferGeometry();
            const lineMaterial = new THREE.LineBasicMaterial({
                color: handedness === 'left' ? 0x00ffff : 0xff00ff,
                linewidth: 1
            });

            // Create line with initial positions (will be updated)
            const positions = new Float32Array(6); // 2 points * 3 coordinates
            lineGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            const line = new THREE.Line(lineGeometry, lineMaterial);

            // Store connection info with the line
            line.userData = {
                joint1: joint1Name,
                joint2: joint2Name
            };

            // Add to scene and store reference
            this.scene.add(line);
            this.handLines[handedness].push(line);
        }
    }

    // Update status display
    updateStatus(message) {
        if (this.statusElement) {
            this.statusElement.textContent = `Hand tracking status: ${message}`;
        }
    }

    // Set position offset for hands
    setPositionOffset(x, y, z) {
        this.positionOffset.set(x, y, z);
        console.log(`Hand position offset set to (${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)})`);

        // Update UI
        const positionInfoElement = document.getElementById('hand-position-info');
        if (positionInfoElement) {
            positionInfoElement.textContent = `Hand position offset: (${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)})`;
        }
    }

    // Update hand positions
    update(frame, referenceSpace) {
        if (!frame) return;

        try {
            // Update each hand
            for (const handedness of ['left', 'right']) {
                const hand = this.hands[handedness];
                if (!hand) continue;

                // Update each joint
                for (const [jointName, joint] of Object.entries(this.joints[handedness])) {
                    try {
                        // Try to get the joint in different ways
                        let xrJoint = null;

                        // Method 1: Direct access to joints
                        if (hand.joints && hand.joints[jointName]) {
                            xrJoint = hand.joints[jointName];
                        }
                        // Method 2: Using get method if available
                        else if (hand.joints && typeof hand.joints.get === 'function') {
                            try {
                                xrJoint = hand.joints.get(jointName);
                            } catch (e) {
                                // Ignore error
                            }
                        }
                        // Method 3: Try to access the hand object directly
                        else if (typeof hand.get === 'function') {
                            try {
                                xrJoint = hand.get(jointName);
                            } catch (e) {
                                // Ignore error
                            }
                        }
                        // Method 4: If the hand itself has the joint as a property
                        else if (hand[jointName]) {
                            xrJoint = hand[jointName];
                        }

                        if (!xrJoint) continue;

                        // Get joint pose
                        const pose = frame.getJointPose(xrJoint, referenceSpace);
                        if (pose) {
                            // Update joint position and rotation
                            // Apply position offset to move hands to correct position
                            joint.position.set(
                                pose.transform.position.x + this.positionOffset.x,
                                pose.transform.position.y + this.positionOffset.y,
                                pose.transform.position.z + this.positionOffset.z
                            );
                            joint.quaternion.set(
                                pose.transform.orientation.x,
                                pose.transform.orientation.y,
                                pose.transform.orientation.z,
                                pose.transform.orientation.w
                            );

                            // Set radius based on joint radius if available
                            if (pose.radius) {
                                joint.scale.setScalar(pose.radius / this.jointRadius);
                            }

                            // Make joint visible
                            joint.visible = true;
                        } else {
                            // Hide joint if no pose
                            joint.visible = false;
                        }
                    } catch (jointError) {
                        console.warn(`Error updating joint ${jointName}:`, jointError);
                        // Hide joint on error
                        joint.visible = false;
                    }
                }

                // Update lines connecting joints
                try {
                    this.updateHandLines(handedness);
                } catch (lineError) {
                    console.warn(`Error updating hand lines for ${handedness}:`, lineError);
                }

                // Check for pinch gesture
                try {
                    this.detectPinch(handedness);
                } catch (pinchError) {
                    console.warn(`Error detecting pinch for ${handedness}:`, pinchError);
                }
            }
        } catch (error) {
            console.error('Error in hand tracking update:', error);
        }
    }

    // Update lines connecting joints
    updateHandLines(handedness) {
        for (const line of this.handLines[handedness]) {
            const joint1 = this.joints[handedness][line.userData.joint1];
            const joint2 = this.joints[handedness][line.userData.joint2];

            // Skip if either joint is not visible
            if (!joint1 || !joint2 || !joint1.visible || !joint2.visible) {
                line.visible = false;
                continue;
            }

            // Update line positions
            const positions = line.geometry.attributes.position.array;

            // Start point
            positions[0] = joint1.position.x;
            positions[1] = joint1.position.y;
            positions[2] = joint1.position.z;

            // End point
            positions[3] = joint2.position.x;
            positions[4] = joint2.position.y;
            positions[5] = joint2.position.z;

            // Mark the attribute as needing an update
            line.geometry.attributes.position.needsUpdate = true;

            // Make line visible
            line.visible = true;
        }
    }

    // Detect pinch gesture between thumb and index finger
    detectPinch(handedness) {
        const thumbTip = this.joints[handedness]['thumb-tip'];
        const indexTip = this.joints[handedness]['index-finger-tip'];

        // Skip if either joint is not visible
        if (!thumbTip || !indexTip || !thumbTip.visible || !indexTip.visible) {
            return;
        }

        // Calculate distance between thumb tip and index finger tip
        const distance = thumbTip.position.distanceTo(indexTip.position);
        this.pinchDistance[handedness] = distance;

        // Check for pinch gesture
        const wasPinching = this.pinchState[handedness];

        // Use different thresholds for pinch start and end to prevent flickering
        if (!wasPinching && distance < this.pinchThreshold) {
            // Pinch started
            this.pinchState[handedness] = true;

            // Change material of thumb and index finger tips to indicate pinch
            thumbTip.material = this.pinchMaterials[handedness];
            indexTip.material = this.pinchMaterials[handedness];

            console.log(`${handedness} hand: Pinch started`);
            this.updateStatus(`${handedness.charAt(0).toUpperCase() + handedness.slice(1)} hand: Pinch detected`);

            // Call pinch start callback if defined
            if (typeof this.onPinchStart === 'function') {
                this.onPinchStart(handedness, thumbTip.position.clone());
            }
        }
        else if (wasPinching && distance > this.pinchReleaseThreshold) {
            // Pinch ended
            this.pinchState[handedness] = false;

            // Restore original materials
            thumbTip.material = this.jointMaterials[handedness];
            indexTip.material = this.jointMaterials[handedness];

            console.log(`${handedness} hand: Pinch ended`);
            this.updateStatus(`${handedness.charAt(0).toUpperCase() + handedness.slice(1)} hand: Pinch released`);

            // Call pinch end callback if defined
            if (typeof this.onPinchEnd === 'function') {
                this.onPinchEnd(handedness, thumbTip.position.clone());
            }
        }
    }

    // Check if a hand is currently pinching
    isPinching(handedness) {
        return this.pinchState[handedness] || false;
    }

    // Get the current pinch position (returns the midpoint between thumb and index finger)
    getPinchPosition(handedness) {
        if (!this.isPinching(handedness)) {
            return null;
        }

        const thumbTip = this.joints[handedness]['thumb-tip'];
        const indexTip = this.joints[handedness]['index-finger-tip'];

        if (!thumbTip || !thumbTip.visible || !indexTip || !indexTip.visible) {
            return null;
        }

        // Return the midpoint between thumb and index finger
        return new THREE.Vector3().addVectors(thumbTip.position, indexTip.position).multiplyScalar(0.5);
    }

    // Set callback for pinch start event
    setOnPinchStart(callback) {
        if (typeof callback === 'function') {
            this.onPinchStart = callback;
        }
    }

    // Set callback for pinch end event
    setOnPinchEnd(callback) {
        if (typeof callback === 'function') {
            this.onPinchEnd = callback;
        }
    }

    // Get the hand model for a specific hand
    getHandModel(handedness) {
        if (this.handModels && this.handModels[handedness]) {
            return this.handModels[handedness];
        }
        return null;
    }
}

export default HandTracking;
