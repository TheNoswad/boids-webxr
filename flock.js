// Flock manager for boids simulation
import Boid from './boid.js';

class Flock {
    constructor(scene, count = 200) {
        this.boids = [];
        this.scene = scene;

        // Default parameters - adjusted for smoother movement
        this.params = {
            separationDistance: 0.8,  // Slightly increased
            alignmentDistance: 1.5,   // Increased for more consistent alignment
            cohesionDistance: 1.8,    // Increased for smoother grouping
            separationForce: 1.0,     // Reduced to prevent erratic movements
            alignmentForce: 0.6,      // Reduced for smoother turning
            cohesionForce: 0.5,       // Reduced for less aggressive grouping
            boundaryRadius: 5.0,      // Kept the same
            boundaryForce: 0.2,       // Reduced for smoother boundary response
            attractionPoints: [],     // Points that attract boids (like pinched fingers)
            attractionDistance: 3.0,  // How far boids can see attraction points (in meters)
            attractionForce: 1.5      // Strength of attraction (higher = stronger pull)
        };

        // Create initial boids
        this.addBoids(count);
    }

    addBoids(count) {
        for (let i = 0; i < count; i++) {
            const position = new THREE.Vector3(
                Math.random() * 6 - 3,
                Math.random() * 3 + 1,
                Math.random() * 6 - 3
            );

            // Create boids with random colors
            const hue = Math.random();
            const color = new THREE.Color().setHSL(hue, 0.8, 0.5);

            this.boids.push(new Boid(this.scene, position, color.getHex()));
        }
    }

    update() {
        // Apply flocking behavior to each boid
        for (const boid of this.boids) {
            boid.flock(this.boids, this.params);
        }

        // Update positions
        for (const boid of this.boids) {
            boid.update();
        }
    }

    // Remove all boids from the scene
    removeAll() {
        for (const boid of this.boids) {
            boid.remove(this.scene);
        }
        this.boids = [];
    }

    // Set simulation parameters
    setParameters(params) {
        Object.assign(this.params, params);
    }

    // Add an attraction point (like a pinched finger)
    addAttractionPoint(position) {
        // Clone the position to avoid reference issues
        const point = position.clone();
        this.params.attractionPoints.push(point);
        return point; // Return the point for future reference
    }

    // Remove an attraction point
    removeAttractionPoint(point) {
        const index = this.params.attractionPoints.indexOf(point);
        if (index !== -1) {
            this.params.attractionPoints.splice(index, 1);
            return true;
        }
        return false;
    }

    // Update an attraction point's position
    updateAttractionPoint(point, newPosition) {
        const index = this.params.attractionPoints.indexOf(point);
        if (index !== -1) {
            point.copy(newPosition);
            return true;
        }
        return false;
    }

    // Clear all attraction points
    clearAttractionPoints() {
        this.params.attractionPoints = [];
    }
}

export default Flock;
