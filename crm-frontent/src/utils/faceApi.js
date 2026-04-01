/**
 * Shared face-api.js loader + helpers.
 * Models are served from /public/models/
 */
import * as faceapi from 'face-api.js';

let modelsLoaded = false;

export async function loadModels() {
  if (modelsLoaded) return;
  const MODEL_URL = '/models';
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]);
  modelsLoaded = true;
}

// Higher inputSize = more accurate, slower. 416 is a good balance for attendance.
export const DETECTOR_OPTIONS = new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 });

/**
 * Detect a single face + landmarks + descriptor.
 * Returns full result object or null.
 */
export async function detectFull(input) {
  return faceapi
    .detectSingleFace(input, DETECTOR_OPTIONS)
    .withFaceLandmarks()
    .withFaceDescriptor();
}

/**
 * Detect face + landmarks only (no descriptor — faster, for live overlay).
 */
export async function detectFast(input) {
  return faceapi
    .detectSingleFace(input, DETECTOR_OPTIONS)
    .withFaceLandmarks();
}

/**
 * Detect a single face and return its 128-d descriptor.
 * Returns Float32Array or null if no face found.
 */
export async function getDescriptor(input) {
  const result = await detectFull(input);
  return result ? result.descriptor : null;
}

/**
 * Euclidean distance between two Float32Array descriptors.
 * < 0.5  → same person (strict)
 * < 0.6  → likely same person
 * > 0.6  → different person
 */
export function descriptorDistance(d1, d2) {
  if (!d1 || !d2 || d1.length !== d2.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < d1.length; i++) sum += (d1[i] - d2[i]) ** 2;
  return Math.sqrt(sum);
}

export { faceapi };
