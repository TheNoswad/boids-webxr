// Floating menu for boids simulation parameters
import Flock from './flock.js';
import Boid from './boid.js';

// Store references to DOM elements
const elements = {
    menu: null,
    menuHeader: null,
    menuToggle: null,
    menuContent: null,
    sliders: {},
    sliderValues: {},
    resetBoidsButton: null,
    resetParamsButton: null
};

// Default parameter values
const defaultParams = {
    // Flock parameters
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

    // Boid parameters
    maxSpeed: 0.04,
    maxForce: 0.005,
    smoothingFactor: 0.8,

    // Other parameters
    boidCount: 30
};

// Reference to the flock
let flock = null;

// Initialize the menu
export function initMenu(flockInstance) {
    flock = flockInstance;

    // Get DOM elements
    elements.menu = document.getElementById('floating-menu');
    elements.menuHeader = document.getElementById('floating-menu-header');
    elements.menuToggle = document.getElementById('floating-menu-toggle');
    elements.menuContent = document.getElementById('menu-content');
    elements.resetBoidsButton = document.getElementById('reset-boids');
    elements.resetParamsButton = document.getElementById('reset-params');

    // Get all sliders and their value displays
    const sliders = document.querySelectorAll('input[type="range"]');
    sliders.forEach(slider => {
        const id = slider.id;
        elements.sliders[id] = slider;
        elements.sliderValues[id] = document.getElementById(`${id}-value`);

        // Add event listener to update value display and apply parameter
        slider.addEventListener('input', () => {
            updateSliderValue(id);
            applyParameters();
        });
    });

    // Add event listeners for buttons
    elements.resetBoidsButton.addEventListener('click', resetBoids);
    elements.resetParamsButton.addEventListener('click', resetAllParameters);

    // Add event listener for menu toggle
    elements.menuToggle.addEventListener('click', toggleMenu);

    // Make the menu draggable
    makeMenuDraggable();

    // Initialize slider values from current flock parameters
    initializeSliderValues();
}

// Initialize slider values from current flock parameters
function initializeSliderValues() {
    if (!flock) return;

    // Get current parameters from flock
    const flockParams = flock.params;

    // Update sliders with current values
    for (const [key, value] of Object.entries(flockParams)) {
        const sliderId = kebabCase(key);
        const slider = elements.sliders[sliderId];

        if (slider) {
            slider.value = value;
            updateSliderValue(sliderId);
        }
    }

    // Update boid-specific parameters
    if (flock.boids.length > 0) {
        const boid = flock.boids[0];

        elements.sliders['max-speed'].value = boid.maxSpeed;
        elements.sliders['max-force'].value = boid.maxForce;
        elements.sliders['smoothing-factor'].value = boid.smoothingFactor;

        updateSliderValue('max-speed');
        updateSliderValue('max-force');
        updateSliderValue('smoothing-factor');
    }

    // Update boid count
    elements.sliders['boid-count'].value = flock.boids.length;
    updateSliderValue('boid-count');
}

// Update the displayed value for a slider
function updateSliderValue(id) {
    const slider = elements.sliders[id];
    const valueDisplay = elements.sliderValues[id];

    if (slider && valueDisplay) {
        valueDisplay.textContent = slider.value;
    }
}

// Apply parameters from sliders to the simulation
function applyParameters() {
    if (!flock) return;

    // Create a parameters object
    const params = {
        separationDistance: parseFloat(elements.sliders['separation-distance'].value),
        alignmentDistance: parseFloat(elements.sliders['alignment-distance'].value),
        cohesionDistance: parseFloat(elements.sliders['cohesion-distance'].value),
        separationForce: parseFloat(elements.sliders['separation-force'].value),
        alignmentForce: parseFloat(elements.sliders['alignment-force'].value),
        cohesionForce: parseFloat(elements.sliders['cohesion-force'].value),
        boundaryRadius: parseFloat(elements.sliders['boundary-radius'].value),
        boundaryForce: parseFloat(elements.sliders['boundary-force'].value),
        attractionDistance: parseFloat(elements.sliders['attraction-distance'].value),
        attractionForce: parseFloat(elements.sliders['attraction-force'].value)
    };

    // Apply flock parameters
    flock.setParameters(params);

    // Apply boid-specific parameters
    const maxSpeed = parseFloat(elements.sliders['max-speed'].value);
    const maxForce = parseFloat(elements.sliders['max-force'].value);
    const smoothingFactor = parseFloat(elements.sliders['smoothing-factor'].value);

    for (const boid of flock.boids) {
        if (boid) {
            boid.maxSpeed = maxSpeed;
            boid.maxForce = maxForce;
            boid.smoothingFactor = smoothingFactor;
        }
    }

    // Update boundary sphere if it exists
    updateBoundarySphere();
}

// Update the boundary sphere to match the current boundary radius
function updateBoundarySphere() {
    // Find the boundary sphere in the scene
    if (flock && flock.scene) {
        const boundarySphere = flock.scene.children.find(child =>
            child.type === 'Mesh' &&
            child.geometry.type === 'SphereGeometry' &&
            child.material.wireframe === true
        );

        if (boundarySphere) {
            const radius = parseFloat(elements.sliders['boundary-radius'].value);
            boundarySphere.scale.set(radius / 5.0, radius / 5.0, radius / 5.0); // Adjust based on original size
        }
    }
}

// Reset boids (remove all and create new ones)
function resetBoids() {
    if (!flock) return;

    // Get the current count
    const count = parseInt(elements.sliders['boid-count'].value);

    // Remove all existing boids
    flock.removeAll();

    // Add new boids
    flock.addBoids(count);

    // Apply current parameters to new boids
    applyParameters();
}

// Reset all parameters to defaults
function resetAllParameters() {
    // Reset all sliders to default values
    for (const [key, value] of Object.entries(defaultParams)) {
        const sliderId = kebabCase(key);
        const slider = elements.sliders[sliderId];

        if (slider) {
            slider.value = value;
            updateSliderValue(sliderId);
        }
    }

    // Apply the default parameters
    applyParameters();
}

// Toggle menu expanded/collapsed state
function toggleMenu() {
    const menuContent = elements.menuContent;
    const menuToggle = elements.menuToggle;

    if (elements.menu.classList.contains('collapsed')) {
        // Expand
        elements.menu.classList.remove('collapsed');
        menuToggle.textContent = '−'; // Minus sign
    } else {
        // Collapse
        elements.menu.classList.add('collapsed');
        menuToggle.textContent = '+'; // Plus sign
    }
}

// Make the menu draggable
function makeMenuDraggable() {
    const menu = elements.menu;
    const header = elements.menuHeader;

    let isDragging = false;
    let offsetX, offsetY;

    header.addEventListener('mousedown', (e) => {
        isDragging = true;
        offsetX = e.clientX - menu.getBoundingClientRect().left;
        offsetY = e.clientY - menu.getBoundingClientRect().top;

        // Prevent text selection during drag
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        const x = e.clientX - offsetX;
        const y = e.clientY - offsetY;

        // Keep the menu within the window bounds
        const maxX = window.innerWidth - menu.offsetWidth;
        const maxY = window.innerHeight - menu.offsetHeight;

        menu.style.left = `${Math.max(0, Math.min(x, maxX))}px`;
        menu.style.top = `${Math.max(0, Math.min(y, maxY))}px`;
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
    });
}

// Utility function to convert camelCase to kebab-case
function kebabCase(str) {
    return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

// Initialize the menu when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // The flock instance will be set later from index.js
    console.log('Menu module loaded, waiting for flock instance');
});
