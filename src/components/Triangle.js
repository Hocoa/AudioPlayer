// import * as THREE from '../lib/three.module.js';
import * as THREE from "three";
import { randomRange } from "./randomRange.js";

export class ILineDistanceOption {
  startShow;
  endShow;
  startHide;
  endHide;
}

export class Triangle {
  rotate = Math.random() * 360;
  id = Math.random();
  distance;
  rotateSpeed;
  angle;
  // public pointA: THREE.Vector3;
  // public pointB: THREE.Vector3;
  // public pointC: THREE.Vector3;
  speed;
  center;
  mesh;
  showDistance;
  panelMaterial;
  lineMaterial;
  panelOpacity = 0.1;
  line;
  group;
  onDelete;
  constructor(
    size,
    center,
    angle,
    speed,
    rotateSpeed,
    material,
    lineMaterial,
    lineDistance,
    cb
  ) {
    this.rotateSpeed = rotateSpeed;
    this.angle = angle;
    this.speed = speed;
    this.center = center;
    this.onDelete = cb;
    this.distance = lineDistance.startShow;
    this.showDistance = lineDistance;
    this.panelMaterial = new THREE.MeshBasicMaterial().copy(material);
    this.panelMaterial.transparent = true;
    this.lineMaterial = new THREE.LineBasicMaterial().copy(lineMaterial);
    this.lineMaterial.transparent = true;
    const panelGeometry = new THREE.Geometry();
    const lineGeometry = new THREE.Geometry();

    const vertices = [
      new THREE.Vector3(
        randomRange(size, size / 2),
        randomRange(size, size / 2),
        randomRange(size, size / 2)
      ),
      new THREE.Vector3(
        randomRange(size, size / 2) * -1,
        randomRange(size, size / 2),
        randomRange(size, size / 2) - 1
      ),
      new THREE.Vector3(
        randomRange(size, size / 2) * -1,
        randomRange(size, size / 2) * -1,
        randomRange(size, size / 2) - 1
      )
    ];

    panelGeometry.vertices.push(...vertices);

    lineGeometry.vertices.push(...[...vertices, vertices[0]]);

    panelGeometry.faces.push(new THREE.Face3(0, 1, 2));
    panelGeometry.computeFaceNormals();
    panelGeometry.computeVertexNormals();

    this.line = new THREE.Line(lineGeometry, this.lineMaterial);
    this.mesh = new THREE.Mesh(panelGeometry, this.panelMaterial);
    this.group = new THREE.Group();
    this.translateOnAxis(this.translate(this.distance), 1);
    this.group.add(this.line);
    this.group.add(this.mesh);
    this.rotateZ(this.rotate);
    this.updatePosition(0);
  }

  rotateZ(angle) {
    this.mesh.geometry.rotateZ(angle);
    this.line.geometry.rotateZ(angle);
  }

  translate(distance) {
    const x = Math.cos((this.angle * Math.PI) / 180) * distance;
    const y = Math.sin((this.angle * Math.PI) / 180) * distance;
    const z =
      (Math.cos((this.angle * Math.PI) / 360) * distance * this.angle) / 180;
    return new THREE.Vector3(x, y, z);
  }

  translateOnAxis(axis, distance) {
    this.group.translateOnAxis(axis, distance);
  }

  updatePosition(delay) {
    this.translateOnAxis(this.translate(delay * this.speed), 1);
    this.distance += delay * this.speed;
    this.rotateZ(this.rotateSpeed * delay);
    this.panelMaterial.opacity =
      this.opacity(this.distance, this.showDistance) * this.panelOpacity;
    this.lineMaterial.opacity = this.opacity(this.distance, this.showDistance);
    if (this.distance > this.showDistance.endHide) {
      this.delete();
    }
  }

  delete() {
    this.onDelete(this);
    this.mesh.geometry.dispose();
    this.line.geometry.dispose();
  }

  opacity(distance, showDistance) {
    if (this.distance < showDistance.endShow) {
      return (
        (this.distance - showDistance.startShow) /
        (showDistance.endShow - showDistance.startShow)
      );
    } else if (this.distance > showDistance.startHide) {
      return (
        (showDistance.endHide - this.distance) /
        (showDistance.endHide - showDistance.startHide)
      );
    } else {
      return 1;
    }
  }

  transition(delay) {
    this.updatePosition(delay);
  }
}
