// VR Menu for WebXR Boids Simulation
import Flock from './flock.js';
import Boid from './boid.js';

class VRMenu {
    constructor(scene, flock, renderer) {
        this.scene = scene;
        this.flock = flock;
        this.renderer = renderer;

        // Menu panel
        this.panel = null;

        // Menu position and orientation
        this.position = new THREE.Vector3(0, 1.6, -0.5); // Default position at eye level in front of user
        this.followController = true; // Whether to follow controller

        // Menu dimensions
        this.width = 0.4;
        this.height = 0.6;

        // Sliders and buttons
        this.sliders = {};
        this.buttons = {};

        // Active interaction tracking
        this.activeInteraction = null;

        // Default parameter values (same as in menu.js)
        this.defaultParams = {
            separationDistance: 0.8,
            alignmentDistance: 1.5,
            cohesionDistance: 1.8,
            separationForce: 1.0,
            alignmentForce: 0.6,
            cohesionForce: 0.5,
            boundaryRadius: 5.0,
            boundaryForce: 0.2,
            attractionDistance: 2.0,
            attractionForce: 1.0,
            maxSpeed: 0.04,
            maxForce: 0.005,
            smoothingFactor: 0.8,
            boidCount: 30
        };

        // Parameter ranges (min, max, step)
        this.paramRanges = {
            separationDistance: [0.1, 3.0, 0.1],
            alignmentDistance: [0.1, 5.0, 0.1],
            cohesionDistance: [0.1, 5.0, 0.1],
            separationForce: [0.1, 3.0, 0.1],
            alignmentForce: [0.1, 2.0, 0.1],
            cohesionForce: [0.1, 2.0, 0.1],
            boundaryRadius: [1.0, 10.0, 0.5],
            boundaryForce: [0.05, 1.0, 0.05],
            attractionDistance: [0.5, 5.0, 0.1],
            attractionForce: [0.1, 3.0, 0.1],
            maxSpeed: [0.01, 0.1, 0.01],
            maxForce: [0.001, 0.02, 0.001],
            smoothingFactor: [0.1, 0.95, 0.05],
            boidCount: [10, 200, 10]
        };

        // Current parameter values
        this.currentParams = { ...this.defaultParams };

        // Create the menu
        this.createMenu();
    }

    createMenu() {
        // Create a group to hold all menu elements
        this.panel = new THREE.Group();

        // Create background panel
        const panelGeometry = new THREE.PlaneGeometry(this.width, this.height);
        const panelMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
        });
        const panelMesh = new THREE.Mesh(panelGeometry, panelMaterial);
        this.panel.add(panelMesh);

        // Add title
        this.addText("Boid Parameters", 0, this.height / 2 - 0.03, 0.03);

        // Add sliders for each parameter
        let yPos = this.height / 2 - 0.08;
        const sliderWidth = this.width * 0.8;
        const sliderHeight = 0.02;
        const sliderSpacing = 0.04;

        // Create sliders for each parameter group
        this.addSectionTitle("Separation", 0, yPos, 0.02);
        yPos -= 0.03;

        this.addSlider("separationDistance", "Distance", 0, yPos, sliderWidth, sliderHeight);
        yPos -= sliderSpacing;

        this.addSlider("separationForce", "Force", 0, yPos, sliderWidth, sliderHeight);
        yPos -= sliderSpacing;

        this.addSectionTitle("Alignment", 0, yPos, 0.02);
        yPos -= 0.03;

        this.addSlider("alignmentDistance", "Distance", 0, yPos, sliderWidth, sliderHeight);
        yPos -= sliderSpacing;

        this.addSlider("alignmentForce", "Force", 0, yPos, sliderWidth, sliderHeight);
        yPos -= sliderSpacing;

        this.addSectionTitle("Cohesion", 0, yPos, 0.02);
        yPos -= 0.03;

        this.addSlider("cohesionDistance", "Distance", 0, yPos, sliderWidth, sliderHeight);
        yPos -= sliderSpacing;

        this.addSlider("cohesionForce", "Force", 0, yPos, sliderWidth, sliderHeight);
        yPos -= sliderSpacing;

        this.addSectionTitle("Boundary", 0, yPos, 0.02);
        yPos -= 0.03;

        this.addSlider("boundaryRadius", "Radius", 0, yPos, sliderWidth, sliderHeight);
        yPos -= sliderSpacing;

        this.addSlider("boundaryForce", "Force", 0, yPos, sliderWidth, sliderHeight);
        yPos -= sliderSpacing;

        this.addSectionTitle("Attraction", 0, yPos, 0.02);
        yPos -= 0.03;

        this.addSlider("attractionDistance", "Distance", 0, yPos, sliderWidth, sliderHeight);
        yPos -= sliderSpacing;

        this.addSlider("attractionForce", "Force", 0, yPos, sliderWidth, sliderHeight);
        yPos -= sliderSpacing;

        // Add reset button at the bottom
        this.addButton("resetParams", "Reset All", 0, -this.height / 2 + 0.05, 0.15, 0.04);

        // Position the panel at eye level
        this.panel.position.copy(this.position);

        // Add to scene
        this.scene.add(this.panel);

        // Set initial rotation to face forward
        this.panel.rotation.y = Math.PI; // Face the user
    }

    addText(text, x, y, size = 0.02, color = 0xffffff) {
        // Create canvas for text
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 512;
        canvas.height = 128;

        // Draw text on canvas
        context.fillStyle = 'white';
        context.font = '40px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, canvas.width / 2, canvas.height / 2);

        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;

        // Create material and geometry
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide
        });

        const aspect = canvas.width / canvas.height;
        const geometry = new THREE.PlaneGeometry(size * aspect, size);

        // Create mesh and add to panel
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, 0.001);
        this.panel.add(mesh);

        return mesh;
    }

    addSectionTitle(text, x, y, size = 0.02) {
        // Create canvas for section title
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 512;
        canvas.height = 64;

        // Draw text on canvas
        context.fillStyle = '#4285f4'; // Blue color for section titles
        context.font = 'bold 32px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, canvas.width / 2, canvas.height / 2);

        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;

        // Create material and geometry
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide
        });

        const aspect = canvas.width / canvas.height;
        const geometry = new THREE.PlaneGeometry(size * aspect, size);

        // Create mesh and add to panel
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, 0.001);
        this.panel.add(mesh);

        return mesh;
    }

    addSlider(paramName, label, x, y, width, height) {
        const group = new THREE.Group();
        group.position.set(x, y, 0.001);

        // Add label
        const labelMesh = this.addText(label, -width / 2 + 0.03, 0, 0.015);
        labelMesh.position.set(-width / 2 + 0.05, 0.01, 0.001);
        group.add(labelMesh);

        // Add slider track
        const trackGeometry = new THREE.PlaneGeometry(width, height / 3);
        const trackMaterial = new THREE.MeshBasicMaterial({
            color: 0x444444,
            side: THREE.DoubleSide
        });
        const track = new THREE.Mesh(trackGeometry, trackMaterial);
        group.add(track);

        // Add slider handle
        const handleGeometry = new THREE.PlaneGeometry(height / 2, height);
        const handleMaterial = new THREE.MeshBasicMaterial({
            color: 0x4285f4,
            side: THREE.DoubleSide
        });
        const handle = new THREE.Mesh(handleGeometry, handleMaterial);

        // Position handle based on current value
        const [min, max, step] = this.paramRanges[paramName];
        const value = this.currentParams[paramName];
        const normalizedValue = (value - min) / (max - min);
        handle.position.x = -width / 2 + normalizedValue * width;

        group.add(handle);

        // Add value text
        const valueMesh = this.addText(value.toString(), width / 2 - 0.03, 0, 0.015);
        valueMesh.position.set(width / 2 - 0.03, 0.01, 0.001);
        group.add(valueMesh);

        // Store references
        this.sliders[paramName] = {
            group,
            track,
            handle,
            valueMesh,
            min,
            max,
            step,
            width
        };

        this.panel.add(group);
        return group;
    }

    addButton(id, label, x, y, width, height) {
        const group = new THREE.Group();
        group.position.set(x, y, 0.001);

        // Button background
        const bgGeometry = new THREE.PlaneGeometry(width, height);
        const bgMaterial = new THREE.MeshBasicMaterial({
            color: 0x4285f4,
            side: THREE.DoubleSide
        });
        const background = new THREE.Mesh(bgGeometry, bgMaterial);
        group.add(background);

        // Button label
        const labelMesh = this.addText(label, 0, 0, height * 0.6);
        labelMesh.position.set(0, 0, 0.001);
        group.add(labelMesh);

        // Store reference
        this.buttons[id] = {
            group,
            background,
            labelMesh
        };

        this.panel.add(group);
        return group;
    }

    // Update slider value based on controller interaction
    updateSlider(paramName, normalizedValue) {
        const slider = this.sliders[paramName];
        if (!slider) return;

        // Clamp value between 0 and 1
        normalizedValue = Math.max(0, Math.min(1, normalizedValue));

        // Calculate actual value based on range
        const [min, max, step] = this.paramRanges[paramName];
        let value = min + normalizedValue * (max - min);

        // Round to nearest step
        value = Math.round(value / step) * step;

        // Update handle position
        slider.handle.position.x = -slider.width / 2 + normalizedValue * slider.width;

        // Update value text
        const valueText = value.toFixed(String(step).split('.')[1]?.length || 0);
        this.updateTextMesh(slider.valueMesh, valueText);

        // Store current value
        this.currentParams[paramName] = value;

        // Apply parameter to simulation
        this.applyParameters();
    }

    // Update text on a text mesh
    updateTextMesh(mesh, text) {
        const material = mesh.material;
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 512;
        canvas.height = 128;

        context.fillStyle = 'white';
        context.font = '40px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, canvas.width / 2, canvas.height / 2);

        // Update texture
        if (material.map) {
            material.map.dispose();
        }

        material.map = new THREE.CanvasTexture(canvas);
        material.needsUpdate = true;
    }

    // Apply current parameters to the simulation
    applyParameters() {
        if (!this.flock) return;

        // Create a parameters object for flock
        const flockParams = {
            separationDistance: this.currentParams.separationDistance,
            alignmentDistance: this.currentParams.alignmentDistance,
            cohesionDistance: this.currentParams.cohesionDistance,
            separationForce: this.currentParams.separationForce,
            alignmentForce: this.currentParams.alignmentForce,
            cohesionForce: this.currentParams.cohesionForce,
            boundaryRadius: this.currentParams.boundaryRadius,
            boundaryForce: this.currentParams.boundaryForce,
            attractionDistance: this.currentParams.attractionDistance,
            attractionForce: this.currentParams.attractionForce
        };

        // Apply flock parameters
        this.flock.setParameters(flockParams);

        // Apply boid-specific parameters
        for (const boid of this.flock.boids) {
            if (boid) {
                boid.maxSpeed = this.currentParams.maxSpeed;
                boid.maxForce = this.currentParams.maxForce;
                boid.smoothingFactor = this.currentParams.smoothingFactor;
            }
        }

        // Update boundary sphere
        this.updateBoundarySphere();
    }

    // Update the boundary sphere to match the current boundary radius
    updateBoundarySphere() {
        if (this.flock && this.flock.scene) {
            const boundarySphere = this.flock.scene.children.find(child =>
                child.type === 'Mesh' &&
                child.geometry.type === 'SphereGeometry' &&
                child.material.wireframe === true
            );

            if (boundarySphere) {
                const radius = this.currentParams.boundaryRadius;
                boundarySphere.scale.set(radius / 5.0, radius / 5.0, radius / 5.0);
            }
        }
    }

    // Reset all parameters to defaults
    resetParameters() {
        this.currentParams = { ...this.defaultParams };

        // Update all sliders
        for (const [paramName, slider] of Object.entries(this.sliders)) {
            const value = this.defaultParams[paramName];
            const [min, max, step] = this.paramRanges[paramName];
            const normalizedValue = (value - min) / (max - min);

            // Update handle position
            slider.handle.position.x = -slider.width / 2 + normalizedValue * slider.width;

            // Update value text
            const valueText = value.toFixed(String(step).split('.')[1]?.length || 0);
            this.updateTextMesh(slider.valueMesh, valueText);
        }

        // Apply parameters
        this.applyParameters();
    }

    // Check if a controller/hand is interacting with the menu
    checkInteraction(controller) {
        if (!controller || !controller.position) return null;

        // For hand models, try to use index finger tip for interaction
        let interactionPoint = controller.position.clone();
        let interactionDirection = new THREE.Vector3(0, 0, -1);
        interactionDirection.applyQuaternion(controller.quaternion);

        // If this is a hand model with joints, use the index finger tip
        if (controller.children && controller.children.length > 0) {
            // Try to find the index finger tip
            const indexTip = controller.children.find(child =>
                child.name === 'index-finger-tip' ||
                child.name === 'index-finger-phalanx-distal'
            );

            if (indexTip) {
                // Use the index finger tip position
                interactionPoint = indexTip.getWorldPosition(new THREE.Vector3());

                // If we also have the middle joint, use it to determine direction
                const indexMiddle = controller.children.find(child =>
                    child.name === 'index-finger-phalanx-intermediate' ||
                    child.name === 'index-finger-phalanx-proximal'
                );

                if (indexMiddle) {
                    const middlePos = indexMiddle.getWorldPosition(new THREE.Vector3());
                    interactionDirection = new THREE.Vector3().subVectors(interactionPoint, middlePos).normalize();
                }
            }
        }

        // Create a raycaster from the interaction point
        const raycaster = new THREE.Raycaster();
        raycaster.set(interactionPoint, interactionDirection);
        raycaster.near = 0; // Start from the finger tip
        raycaster.far = 0.1; // Only detect very close objects (10cm)

        // Check direct intersection with sliders using a sphere around the finger tip
        for (const [paramName, slider] of Object.entries(this.sliders)) {
            // Check if finger tip is close to the slider track
            const trackWorldPos = new THREE.Vector3();
            slider.track.getWorldPosition(trackWorldPos);

            const distance = interactionPoint.distanceTo(trackWorldPos);
            if (distance < 0.1) { // Within 10cm
                // Get the local X position relative to the slider
                const sliderWorldMatrix = new THREE.Matrix4();
                slider.track.updateMatrixWorld();
                sliderWorldMatrix.copy(slider.track.matrixWorld).invert();

                const localPoint = interactionPoint.clone().applyMatrix4(sliderWorldMatrix);

                // Calculate normalized value (clamped between 0 and 1)
                const normalizedValue = Math.max(0, Math.min(1, (localPoint.x + slider.width / 2) / slider.width));
                return { type: 'slider', paramName, normalizedValue };
            }
        }

        // Check intersection with buttons
        for (const [buttonId, button] of Object.entries(this.buttons)) {
            const buttonWorldPos = new THREE.Vector3();
            button.background.getWorldPosition(buttonWorldPos);

            const distance = interactionPoint.distanceTo(buttonWorldPos);
            if (distance < 0.1) { // Within 10cm
                return { type: 'button', buttonId };
            }
        }

        // Also try the traditional raycasting approach as a fallback
        const intersects = raycaster.intersectObjects(
            [...Object.values(this.sliders).map(s => s.track),
             ...Object.values(this.buttons).map(b => b.background)],
            true
        );

        if (intersects.length > 0) {
            const hitObject = intersects[0].object;

            // Check if it's a slider
            for (const [paramName, slider] of Object.entries(this.sliders)) {
                if (hitObject === slider.track || hitObject.parent === slider.track) {
                    const point = intersects[0].point;
                    const localPoint = slider.track.worldToLocal(point.clone());
                    const normalizedValue = Math.max(0, Math.min(1, (localPoint.x + slider.width / 2) / slider.width));
                    return { type: 'slider', paramName, normalizedValue };
                }
            }

            // Check if it's a button
            for (const [buttonId, button] of Object.entries(this.buttons)) {
                if (hitObject === button.background || hitObject.parent === button.background) {
                    return { type: 'button', buttonId };
                }
            }
        }

        return null;
    }

    // Handle controller/hand interaction
    handleInteraction(controller, isPinching) {
        if (!controller) return;

        // Always check for interaction, even if not pinching (for visual feedback)
        const interaction = this.checkInteraction(controller);

        // Store the active interaction for visual feedback
        this.activeInteraction = interaction;

        // Highlight the active element if any
        this.highlightActiveElement(interaction);

        // Process interaction if pinching
        if (interaction && (isPinching || this.isControllerTriggerPressed(controller))) {
            if (interaction.type === 'slider') {
                this.updateSlider(interaction.paramName, interaction.normalizedValue);

                // Add some haptic feedback if available
                if (controller.gamepad && controller.gamepad.hapticActuators &&
                    controller.gamepad.hapticActuators.length > 0) {
                    controller.gamepad.hapticActuators[0].pulse(0.3, 50); // light pulse
                }
            } else if (interaction.type === 'button' && interaction.buttonId === 'resetParams') {
                this.resetParameters();

                // Add some haptic feedback if available
                if (controller.gamepad && controller.gamepad.hapticActuators &&
                    controller.gamepad.hapticActuators.length > 0) {
                    controller.gamepad.hapticActuators[0].pulse(0.7, 100); // stronger pulse
                }
            }
        }
    }

    // Check if controller trigger is pressed (fallback interaction method)
    isControllerTriggerPressed(controller) {
        if (controller.gamepad) {
            // Check for trigger press on standard gamepad mapping
            return controller.gamepad.buttons[0]?.pressed || false;
        }
        return false;
    }

    // Highlight the active element for visual feedback
    highlightActiveElement(interaction) {
        // Reset all elements to default state
        for (const slider of Object.values(this.sliders)) {
            if (slider.handle) {
                slider.handle.material.color.set(0x4285f4); // Default blue color
            }
        }

        for (const button of Object.values(this.buttons)) {
            if (button.background) {
                button.background.material.color.set(0x4285f4); // Default blue color
            }
        }

        // Highlight the active element
        if (interaction) {
            if (interaction.type === 'slider') {
                const slider = this.sliders[interaction.paramName];
                if (slider && slider.handle) {
                    slider.handle.material.color.set(0xffff00); // Highlight in yellow
                }
            } else if (interaction.type === 'button') {
                const button = this.buttons[interaction.buttonId];
                if (button && button.background) {
                    button.background.material.color.set(0xffff00); // Highlight in yellow
                }
            }
        }
    }

    // Update menu position to follow controller
    updatePosition(controller) {
        if (this.followController && controller && controller.position) {
            // Position menu in front of the controller at eye level
            const direction = new THREE.Vector3(0, 0, -1);
            direction.applyQuaternion(controller.quaternion);
            direction.multiplyScalar(0.5); // Distance from controller

            // Create position based on controller
            const newPosition = controller.position.clone().add(direction);

            // Adjust height to be at eye level (around 1.6m) but maintain some relation to controller height
            // This keeps the menu at a comfortable height while still following the controller somewhat
            newPosition.y = Math.max(1.5, controller.position.y + 0.2);

            this.panel.position.copy(newPosition);

            // Make menu face the user
            this.panel.quaternion.copy(controller.quaternion);
        }
    }

    // Show/hide the menu
    setVisible(visible) {
        if (this.panel) {
            this.panel.visible = visible;
        }
    }

    // Update the menu (call this in the render loop)
    update(leftController, rightController, leftPinching, rightPinching) {
        // Update position to follow right controller if available
        if (rightController) {
            this.updatePosition(rightController);
        } else if (leftController) {
            this.updatePosition(leftController);
        }

        // Handle interaction with controllers
        // Check both controllers for interaction, but prioritize the right hand
        let interactionHandled = false;

        if (rightController) {
            this.handleInteraction(rightController, rightPinching);
            interactionHandled = this.activeInteraction !== null;
        }

        // Only check left controller if right controller didn't have an interaction
        if (leftController && !interactionHandled) {
            this.handleInteraction(leftController, leftPinching);
        }

        // Debug visualization - add small spheres at finger tips for debugging
        this.updateDebugVisualizers(leftController, rightController);
    }

    // Add debug visualizers to show where the interaction points are
    updateDebugVisualizers(leftController, rightController) {
        // Create debug visualizers if they don't exist
        if (!this.debugVisualizers) {
            this.debugVisualizers = {
                left: new THREE.Mesh(
                    new THREE.SphereGeometry(0.01, 8, 8),
                    new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.7 })
                ),
                right: new THREE.Mesh(
                    new THREE.SphereGeometry(0.01, 8, 8),
                    new THREE.MeshBasicMaterial({ color: 0xff00ff, transparent: true, opacity: 0.7 })
                )
            };

            this.scene.add(this.debugVisualizers.left);
            this.scene.add(this.debugVisualizers.right);
        }

        // Update positions
        if (leftController) {
            const indexTip = leftController.children.find(child =>
                child.name === 'index-finger-tip' ||
                child.name === 'index-finger-phalanx-distal'
            );

            if (indexTip) {
                this.debugVisualizers.left.position.copy(indexTip.getWorldPosition(new THREE.Vector3()));
                this.debugVisualizers.left.visible = true;
            } else {
                this.debugVisualizers.left.visible = false;
            }
        } else {
            this.debugVisualizers.left.visible = false;
        }

        if (rightController) {
            const indexTip = rightController.children.find(child =>
                child.name === 'index-finger-tip' ||
                child.name === 'index-finger-phalanx-distal'
            );

            if (indexTip) {
                this.debugVisualizers.right.position.copy(indexTip.getWorldPosition(new THREE.Vector3()));
                this.debugVisualizers.right.visible = true;
            } else {
                this.debugVisualizers.right.visible = false;
            }
        } else {
            this.debugVisualizers.right.visible = false;
        }
    }
}

export default VRMenu;
