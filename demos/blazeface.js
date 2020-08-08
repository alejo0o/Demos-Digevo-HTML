/**
 * @license
 * Copyright 2019 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * /LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

import * as blazeface from '@tensorflow-models/blazeface';
import * as tf from '@tensorflow/tfjs-core';
import * as tfjsWasm from '@tensorflow/tfjs-backend-wasm';

import regeneratorRuntime from 'regenerator-runtime';

// tfjsWasm.setWasmPath('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@latest/dist/tfjs-backend-wasm.wasm');

const stats = new Stats();
stats.showPanel(0);
document.body.prepend(stats.domElement);
stats.domElement.style.position = 'absolute';
stats.domElement.style.marginTop = '0';
stats.domElement.style.marginLeft = '0';

let model, ctx, videoWidth, videoHeight, camera, canvas;

const state = {
  backend: 'wasm',
};

const gui = new dat.GUI();
gui
  .add(state, 'backend', ['wasm', 'webgl', 'cpu'])
  .onChange(async (backend) => {
    await tf.setBackend(backend);
  });
document.body.prepend(gui.domElement);
gui.domElement.style.position = 'absolute';
gui.domElement.style.display = 'block';
gui.domElement.style.marginTop = '0';
gui.domElement.style.marginLeft = '78%';

async function setupCamera() {
  camera = document.getElementById('video');

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { facingMode: 'user' },
  });
  camera.srcObject = stream;

  return new Promise((resolve) => {
    camera.onloadedmetadata = () => {
      resolve(camera);
    };
  });
}

const renderPrediction = async () => {
  stats.begin();

  const returnTensors = false;
  const flipHorizontal = true;
  const annotateBoxes = true;
  const predictions = await model.estimateFaces(
    camera,
    returnTensors,
    flipHorizontal,
    annotateBoxes
  );

  if (predictions.length > 0) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < predictions.length; i++) {
      if (returnTensors) {
        predictions[i].topLeft = predictions[i].topLeft.arraySync();
        predictions[i].bottomRight = predictions[i].bottomRight.arraySync();
        if (annotateBoxes) {
          predictions[i].landmarks = predictions[i].landmarks.arraySync();
        }
      }

      const start = predictions[i].topLeft;
      const end = predictions[i].bottomRight;
      const size = [end[0] - start[0], end[1] - start[1]];
      ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
      ctx.fillRect(start[0], start[1], size[0], size[1]);

      if (annotateBoxes) {
        const landmarks = predictions[i].landmarks;

        ctx.fillStyle = 'blue';
        for (let j = 0; j < landmarks.length; j++) {
          const x = landmarks[j][0];
          const y = landmarks[j][1];
          ctx.fillRect(x, y, 5, 5);
        }
      }
    }
  }

  stats.end();

  requestAnimationFrame(renderPrediction);
};

const setupPage = async () => {
  await tf.setBackend(state.backend);
  await setupCamera();
  camera.play();

  videoWidth = camera.videoWidth;
  videoHeight = camera.videoHeight;
  camera.width = videoWidth;
  camera.height = videoHeight;

  canvas = document.getElementById('output');
  canvas.width = videoWidth;
  canvas.height = videoHeight;
  ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';

  model = await blazeface.load();

  renderPrediction();
};

setupPage();
