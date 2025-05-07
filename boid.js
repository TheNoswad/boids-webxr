// Boid class for flocking simulation
class Boid {
    constructor(scene, position, color = 0x1a8cff) {
        // Physics properties
        this.position = position || new THREE.Vector3(
            Math.random() * 10 - 5,
            Math.random() * 5 + 1,
            Math.random() * 10 - 5
        );
        this.velocity = new THREE.Vector3(
            Math.random() * 2 - 1,
            Math.random() * 2 - 1,
            Math.random() * 2 - 1
        ).normalize().multiplyScalar(0.02); // Further reduced initial velocity for smoother start
        this.acceleration = new THREE.Vector3();
        this.maxSpeed = 0.04; // Reduced max speed for smoother movement
        this.maxForce = 0.005; // Reduced max force to prevent sudden direction changes

        // Smoothing properties to reduce jittering
        this.smoothingFactor = 0.8; // Higher = more smoothing
        this.previousVelocity = this.velocity.clone();
        this.targetRotation = new THREE.Quaternion();
        this.rotationSmoothingFactor = 0.85; // Higher = more smoothing

        // Visual representation
        this.mesh = this.createMesh(color);
        scene.add(this.mesh);
    }

    createMesh(color) {
        // Create a cone pointing in the direction of movement
        const geometry = new THREE.ConeGeometry(0.05, 0.2, 8);
        geometry.rotateX(Math.PI / 2); // Orient the cone to point forward (z-axis)
        const material = new THREE.MeshStandardMaterial({
            color: color,
            emissive: 0x000000,
            emissiveIntensity: 1.0,
            roughness: 0.7,
            metalness: 0.3
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(this.position);
        return mesh;
    }

    // Apply flocking behaviors
    flock(boids, params) {
        const separation = this.separate(boids, params.separationDistance);
        const alignment = this.align(boids, params.alignmentDistance);
        const cohesion = this.cohesion(boids, params.cohesionDistance);

        // Apply weights to the forces
        separation.multiplyScalar(params.separationForce);
        alignment.multiplyScalar(params.alignmentForce);
        cohesion.multiplyScalar(params.cohesionForce);

        // Add the forces to acceleration
        this.acceleration.add(separation);
        this.acceleration.add(alignment);
        this.acceleration.add(cohesion);

        // Add boundary force to keep boids within a certain area
        const boundaryForce = this.boundaries(params.boundaryRadius);
        boundaryForce.multiplyScalar(params.boundaryForce);
        this.acceleration.add(boundaryForce);

        // Add attraction to pinch points if any exist
        if (params.attractionPoints && params.attractionPoints.length > 0) {
            const attraction = this.attract(params.attractionPoints, params.attractionDistance);
            attraction.multiplyScalar(params.attractionForce);
            this.acceleration.add(attraction);
        }
    }

    // Separation: steer to avoid crowding local flockmates
    separate(boids, separationDistance) {
        const steering = new THREE.Vector3();
        let count = 0;

        for (const other of boids) {
            if (other === this) continue;

            const distance = this.position.distanceTo(other.position);

            if (distance > 0 && distance < separationDistance) {
                // Calculate vector pointing away from neighbor
                const diff = new THREE.Vector3().subVectors(this.position, other.position);
                diff.normalize();
                diff.divideScalar(distance); // Weight by distance
                steering.add(diff);
                count++;
            }
        }

        if (count > 0) {
            steering.divideScalar(count);
        }

        if (steering.length() > 0) {
            // Implement Reynolds: Steering = Desired - Velocity
            steering.normalize();
            steering.multiplyScalar(this.maxSpeed);
            steering.sub(this.velocity);
            steering.clampLength(0, this.maxForce);
        }

        return steering;
    }

    // Alignment: steer towards the average heading of local flockmates
    align(boids, alignmentDistance) {
        const steering = new THREE.Vector3();
        let count = 0;

        for (const other of boids) {
            if (other === this) continue;

            const distance = this.position.distanceTo(other.position);

            if (distance > 0 && distance < alignmentDistance) {
                steering.add(other.velocity);
                count++;
            }
        }

        if (count > 0) {
            steering.divideScalar(count);
            steering.normalize();
            steering.multiplyScalar(this.maxSpeed);

            // Implement Reynolds: Steering = Desired - Velocity
            const steer = new THREE.Vector3().subVectors(steering, this.velocity);
            steer.clampLength(0, this.maxForce);
            return steer;
        }

        return new THREE.Vector3();
    }

    // Cohesion: steer to move toward the average position of local flockmates
    cohesion(boids, cohesionDistance) {
        const sum = new THREE.Vector3();
        let count = 0;

        for (const other of boids) {
            if (other === this) continue;

            const distance = this.position.distanceTo(other.position);

            if (distance > 0 && distance < cohesionDistance) {
                sum.add(other.position);
                count++;
            }
        }

        if (count > 0) {
            sum.divideScalar(count);
            return this.seek(sum);
        }

        return new THREE.Vector3();
    }

    // Seek a target position
    seek(target) {
        const desired = new THREE.Vector3().subVectors(target, this.position);
        desired.normalize();
        desired.multiplyScalar(this.maxSpeed);

        // Steering = Desired - Velocity
        const steer = new THREE.Vector3().subVectors(desired, this.velocity);
        steer.clampLength(0, this.maxForce);
        return steer;
    }

    // Keep boids within boundaries
    boundaries(boundaryRadius) {
        const desired = new THREE.Vector3();
        const distance = this.position.length();

        if (distance > boundaryRadius) {
            desired.copy(this.position).negate().normalize();
            desired.multiplyScalar(this.maxSpeed);

            const steer = new THREE.Vector3().subVectors(desired, this.velocity);
            steer.clampLength(0, this.maxForce);
            return steer;
        }

        return new THREE.Vector3();
    }

    // Attraction to specific points (like pinched fingers)
    attract(attractionPoints, attractionDistance) {
        const steering = new THREE.Vector3();
        let count = 0;

        // Find the closest attraction point
        let closestPoint = null;
        let closestDistance = Infinity;

        for (const point of attractionPoints) {
            const distance = this.position.distanceTo(point);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestPoint = point;
            }
        }

        // If we found a close enough attraction point, steer towards it
        if (closestPoint && closestDistance < attractionDistance) {
            // The closer we are, the stronger the attraction (up to a point)
            const strength = Math.max(0.1, Math.min(1.0, 1.0 - (closestDistance / attractionDistance)));

            // Create a force towards the attraction point
            const desired = new THREE.Vector3().subVectors(closestPoint, this.position);
            desired.normalize();
            desired.multiplyScalar(this.maxSpeed * strength);

            // Steering = Desired - Velocity
            const steer = new THREE.Vector3().subVectors(desired, this.velocity);
            steer.clampLength(0, this.maxForce);

            // Visual effect: change color based on attraction strength
            // Interpolate between the original color and a bright color based on attraction strength
            if (!this.originalColor) {
                this.originalColor = this.mesh.material.color.clone();
            }

            // Create a bright color (yellow/white) for attracted boids
            const attractedColor = new THREE.Color(0xffff80);

            // Interpolate between original and attracted color based on strength
            this.mesh.material.color.copy(this.originalColor).lerp(attractedColor, strength * 0.7);

            // Make attracted boids slightly emissive for a glowing effect
            this.mesh.material.emissive = new THREE.Color(0x333300).multiplyScalar(strength);

            return steer;
        } else if (this.originalColor) {
            // Reset color when no longer attracted
            this.mesh.material.color.copy(this.originalColor);
            this.mesh.material.emissive = new THREE.Color(0x000000);
        }

        return new THREE.Vector3();
    }

    // Update position and rotation
    update() {
        // Update velocity with smoothing to reduce jittering
        this.velocity.add(this.acceleration);
        this.velocity.clampLength(0, this.maxSpeed);

        // Apply velocity smoothing
        this.velocity.lerp(this.previousVelocity, this.smoothingFactor);
        this.previousVelocity.copy(this.velocity);

        // Apply a minimum threshold to avoid micro-movements
        if (this.acceleration.lengthSq() < 0.00001) {
            this.acceleration.set(0, 0, 0);
        }

        // Update position
        this.position.add(this.velocity);

        // Reset acceleration
        this.acceleration.set(0, 0, 0);

        // Update mesh position
        this.mesh.position.copy(this.position);

        // Update rotation to face direction of movement with smoothing
        if (this.velocity.lengthSq() > 0.00001) {
            // Create a target quaternion based on velocity direction
            const lookAtPos = this.mesh.position.clone().add(this.velocity);
            const tempMesh = new THREE.Object3D();
            tempMesh.position.copy(this.mesh.position);
            tempMesh.lookAt(lookAtPos);
            this.targetRotation.setFromEuler(tempMesh.rotation);

            // Smoothly interpolate current rotation to target rotation
            this.mesh.quaternion.slerp(this.targetRotation, 1 - this.rotationSmoothingFactor);
        }
    }

    // Remove from scene
    remove(scene) {
        scene.remove(this.mesh);
    }
}

export default Boid;
