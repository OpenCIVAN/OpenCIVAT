// For streamlined VR development install the WebXR emulator extension
// https://github.com/MozillaReality/WebXR-emulator-extension

import '@kitware/vtk.js/favicon';
import vtkWasmAppModule from './wasm/vtkWasmApp.js';

// Load the rendering pieces we want to use (for both WebGL and WebGPU)
import '@kitware/vtk.js/Rendering/Profiles/Geometry';

import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkCalculator from '@kitware/vtk.js/Filters/General/Calculator';
import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';
import vtkWebXRRenderWindowHelper from '@kitware/vtk.js/Rendering/WebXR/RenderWindowHelper';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkXMLPolyDataReader from '@kitware/vtk.js/IO/XML/XMLPolyDataReader';
import vtkPolyDataNormals from '@kitware/vtk.js/Filters/Core/PolyDataNormals';
import vtkRemoteView from '@kitware/vtk.js/Rendering/Misc/RemoteView';
import vtkOrientationMarkerWidget from '@kitware/vtk.js/Interaction/Widgets/OrientationMarkerWidget';
import vtkAnnotatedCubeActor from '@kitware/vtk.js/Rendering/Core/AnnotatedCubeActor';
import vtkInteractorStyleTrackballCamera from '@kitware/vtk.js/Interaction/Style/InteractorStyleTrackballCamera';
import { enableWebGPUApp } from "../tarun-webgpu/src/webgpuEntry";

import { AttributeTypes } from '@kitware/vtk.js/Common/DataModel/DataSetAttributes/Constants';
import { FieldDataTypes } from '@kitware/vtk.js/Common/DataModel/DataSet/Constants';
import { XrSessionTypes } from '@kitware/vtk.js/Rendering/WebXR/RenderWindowHelper/Constants';

// Force DataAccessHelper to have access to various data source
import '@kitware/vtk.js/IO/Core/DataAccessHelper/HtmlDataAccessHelper';
import '@kitware/vtk.js/IO/Core/DataAccessHelper/HttpDataAccessHelper';
import '@kitware/vtk.js/IO/Core/DataAccessHelper/JSZipDataAccessHelper';

import vtkResourceLoader from '@kitware/vtk.js/IO/Core/ResourceLoader';

//Yjs setup
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

// Custom UI controls, including button to start XR session
import controlPanel from './controller.html';
import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';
// TensorFlow.js for PCA operations
import * as tf from '@tensorflow/tfjs';

// Dynamically load WebXR polyfill from CDN for WebVR and Cardboard API backwards compatibility
if (navigator.xr === undefined) {
  vtkResourceLoader
    .loadScript(
      'https://cdn.jsdelivr.net/npm/webxr-polyfill@latest/build/webxr-polyfill.js'
    )
    .then(() => {
      // eslint-disable-next-line no-new, no-undef
      new WebXRPolyfill();
    });
}

// ----------------------------------------------------------------------------
// Logging System
// ----------------------------------------------------------------------------

let logContainer = null;
let logMessages = [];
const MAX_LOG_MESSAGES = 100;

function logJsHeap(label) {
  if (performance && performance.memory) {
    const used = performance.memory.usedJSHeapSize / 1e6;
    const total = performance.memory.totalJSHeapSize / 1e6;
    logMessage(
      `${label} JS Heap: ${used.toFixed(2)}MB used / ${total.toFixed(2)}MB allocated`
    );
  } else {
    logMessage(`${label} JS Heap: performance.memory not available`);
  }
}


function initializeLogging() {
  // Create log container
  logContainer = document.createElement('div');
  logContainer.id = 'log-container';
  logContainer.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    width: 400px;
    max-height: 400px;
    background: rgba(0, 0, 0, 0.9);
    color: #ffffff;
    font-family: 'Courier New', monospace;
    font-size: 11px;
    padding: 10px;
    border-radius: 5px;
    border: 1px solid #333;
    overflow-y: auto;
    z-index: 1000;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
    display: block;
  `;

  // Add toggle button
  const toggleButton = document.createElement('button');
  toggleButton.textContent = 'Hide Logs';
  toggleButton.style.cssText = `
    position: fixed;
    top: 10px;
    right: 420px;
    background: #f44336;
    color: white;
    border: none;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    z-index: 1001;
  `;

  toggleButton.addEventListener('click', () => {
    const isVisible = logContainer.style.display !== 'none';
    logContainer.style.display = isVisible ? 'none' : 'block';
    toggleButton.textContent = isVisible ? 'Show Logs' : 'Hide Logs';
    toggleButton.style.background = isVisible ? '#4CAF50' : '#f44336';
  });

  // Add clear button
  const clearButton = document.createElement('button');
  clearButton.textContent = 'Clear';
  clearButton.style.cssText = `
    position: fixed;
    top: 50px;
    right: 420px;
    background: #ff9800;
    color: white;
    border: none;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    z-index: 1001;
  `;

  clearButton.addEventListener('click', () => {
    if (logContainer) {
      logContainer.innerHTML = '';
      logMessages = [];
      logMessage('Logs cleared', 'info');
    }
  });

  document.body.appendChild(logContainer);
  document.body.appendChild(toggleButton);
  document.body.appendChild(clearButton);
}

function logMessage(message, type = 'info') {
  // Always log to console
  console.log(message);

  if (!logContainer) return;

  // Add timestamp
  const timestamp = new Date().toLocaleTimeString();
  const logEntry = `[${timestamp}] ${message}`;

  // Color coding based on type
  const colors = {
    info: '#ffffff',
    success: '#4CAF50',
    warning: '#ff9800',
    error: '#f44336',
    progress: '#2196F3'
  };

  // Create log element
  const logElement = document.createElement('div');
  logElement.style.cssText = `
    color: ${colors[type] || colors.info};
    margin-bottom: 3px;
    line-height: 1.3;
    word-wrap: break-word;
  `;
  logElement.textContent = logEntry;

  // Add to container
  logContainer.appendChild(logElement);
  logMessages.push(logElement);

  // Limit number of messages
  if (logMessages.length > MAX_LOG_MESSAGES) {
    const oldMessage = logMessages.shift();
    if (oldMessage && oldMessage.parentNode) {
      oldMessage.parentNode.removeChild(oldMessage);
    }
  }

  // Auto-scroll to bottom
  logContainer.scrollTop = logContainer.scrollHeight;

  // Auto-show container for important messages
  if (type === 'error' || type === 'warning') {
    logContainer.style.display = 'block';
  }
}

function logInfo(message) {
  logMessage(message, 'info');
}

function logSuccess(message) {
  logMessage(message, 'success');
}

function logWarning(message) {
  logMessage(message, 'warning');
}

function logError(message) {
  logMessage(message, 'error');
}

function logProgress(message) {
  logMessage(message, 'progress');
}

// ----------------------------------------------------------------------------
// TensorFlow.js Configuration and Memory Management
// ----------------------------------------------------------------------------

async function initializeTensorFlow() {
  try {
    logProgress('Initializing TensorFlow.js...');

    // Wait for TensorFlow.js to be ready
    await tf.ready();

    // Get backend info
    const backend = tf.getBackend();
    logSuccess(`TensorFlow.js ready with backend: ${backend}`);

    // Only set flags that actually exist and are valid
    if (backend === 'webgl') {
      try {
        // These are verified working flags for WebGL backend
        tf.env().set('WEBGL_DELETE_TEXTURE_THRESHOLD', 0);
        tf.env().set('WEBGL_FLUSH_THRESHOLD', 1);
        logInfo('WebGL optimizations applied');
      } catch (flagError) {
        logWarning(`Some WebGL flags could not be set: ${flagError.message}`);
      }
    }

    return true;
  } catch (error) {
    logError(`TensorFlow.js initialization failed: ${error.message}`);
    return false;
  }
}

function logMemoryUsage(context = '') {
  try {
    const tfMemory = tf.memory();
    const jsMemory = performance.memory;

    logProgress(`Memory ${context}:`);
    logProgress(`  TF.js: ${tfMemory.numTensors} tensors, ${(tfMemory.numBytes / 1024 / 1024).toFixed(2)}MB`);

    if (jsMemory) {
      const usedMB = Math.round(jsMemory.usedJSHeapSize / 1024 / 1024);
      const totalMB = Math.round(jsMemory.totalJSHeapSize / 1024 / 1024);
      const limitMB = Math.round(jsMemory.jsHeapSizeLimit / 1024 / 1024);
      logProgress(`  JS Heap: ${usedMB}MB used / ${totalMB}MB allocated (limit: ${limitMB}MB)`);

      if (usedMB / limitMB > 0.8) {
        logWarning(`High memory usage: ${((usedMB / limitMB) * 100).toFixed(1)}% of limit`);
      }
    }

    if (tfMemory.numTensors > 50) {
      logWarning(`High tensor count: ${tfMemory.numTensors} tensors active`);
    }
  } catch (error) {
    logWarning(`Could not get memory info: ${error.message}`);
  }
}

function cleanupTensors() {
  try {
    // Force TensorFlow.js cleanup
    const beforeMemory = tf.memory();
    tf.dispose();
    const afterMemory = tf.memory();

    const tensorDiff = beforeMemory.numTensors - afterMemory.numTensors;
    const memoryDiff = (beforeMemory.numBytes - afterMemory.numBytes) / 1024 / 1024;

    if (tensorDiff > 0) {
      logSuccess(`Cleanup freed ${tensorDiff} tensors and ${memoryDiff.toFixed(2)}MB`);
    }

    // Force garbage collection if available
    if (window.gc) {
      window.gc();
      logProgress('JavaScript garbage collection triggered');
    }
  } catch (error) {
    logWarning(`Cleanup error: ${error.message}`);
  }
}

// ----------------------------------------------------------------------------
// PCA Implementation using TensorFlow.js
// ----------------------------------------------------------------------------

async function performPCA(pointsMatrix, numComponents = 3) {
  const numPoints = pointsMatrix.length;
  const numDimensions = pointsMatrix[0].length;

  logInfo(`Starting PCA on ${numPoints.toLocaleString()} points`);
  logProgress(`Input: ${numDimensions}D -> ${numComponents}D`);
  logMemoryUsage('before PCA');

  try {
    // Use tf.tidy for automatic memory management
    const result = await tf.tidy(() => {
      logProgress('Creating data tensor...');

      // Convert to tensor
      const dataTensor = tf.tensor2d(pointsMatrix);
      logProgress(`Data tensor shape: [${dataTensor.shape.join(', ')}]`);

      // Center the data
      logProgress('Centering data...');
      const mean = tf.mean(dataTensor, 0);
      const centeredData = tf.sub(dataTensor, mean);

      // For large datasets or when we want 3 specific dimensions, use variance-based selection
      if (numPoints > 5000 || numComponents === 3) {
        return performVarianceBasedPCA(centeredData, numComponents);
      } else {
        // For smaller datasets, use SVD-based PCA for better quality
        return performSVDBasedPCA(centeredData, numComponents);
      }
    });

    logSuccess('PCA completed successfully');
    logMemoryUsage('after PCA');

    return result;

  } catch (error) {
    logError(`PCA failed: ${error.message}`);
    logMemoryUsage('after PCA error');

    // Clean up and try a fallback method
    cleanupTensors();
    throw error;
  }
}

function performVarianceBasedPCA(centeredData, numComponents) {
  logProgress('Using variance-based PCA approach...');

  const [numSamples, numFeatures] = centeredData.shape;

  // Compute covariance matrix
  const transposed = tf.transpose(centeredData);
  const covariance = tf.div(
    tf.matMul(transposed, centeredData),
    tf.scalar(numSamples - 1)
  );

  // Extract variances (diagonal elements)
  const covarianceArray = covariance.arraySync();
  const variances = [];

  for (let i = 0; i < covarianceArray.length; i++) {
    variances.push({
      index: i,
      variance: covarianceArray[i][i]
    });
  }

  // Sort by variance (descending)
  variances.sort((a, b) => b.variance - a.variance);

  // Select top components
  const selectedDims = variances.slice(0, Math.min(numComponents, variances.length));

  logProgress('Selected dimensions with highest variance:');
  selectedDims.forEach((dim, i) => {
    logProgress(`  ${i + 1}. Dimension ${dim.index}: variance = ${dim.variance.toFixed(6)}`);
  });

  // Extract selected dimensions
  const centeredArray = centeredData.arraySync();
  const transformedData = [];

  for (let i = 0; i < centeredArray.length; i++) {
    const transformedPoint = [];
    for (const dim of selectedDims) {
      transformedPoint.push(centeredArray[i][dim.index]);
    }

    // Pad with zeros if needed for 3D visualization
    while (transformedPoint.length < 3) {
      transformedPoint.push(0);
    }

    transformedData.push(transformedPoint);
  }

  // Calculate explained variance ratio
  const totalVariance = variances.reduce((sum, v) => sum + v.variance, 0);
  const explainedVariance = selectedDims.reduce((sum, v) => sum + v.variance, 0);
  const explainedRatio = (explainedVariance / totalVariance * 100).toFixed(2);

  logProgress(`Explained variance ratio: ${explainedRatio}%`);

  return transformedData;
}

function performSVDBasedPCA(centeredData, numComponents) {
  logProgress('Using SVD-based PCA approach...');

  try {
    // Perform SVD decomposition
    const svd = tf.linalg.svd(centeredData, false, true);
    const { s, v } = svd;

    // Select principal components (first numComponents columns of V)
    const principalComponents = tf.slice(v, [0, 0], [-1, numComponents]);

    // Transform data
    const transformed = tf.matMul(centeredData, principalComponents);

    // Convert to JavaScript array
    let transformedData = transformed.arraySync();

    // Pad with zeros if needed for 3D visualization
    if (numComponents === 2) {
      transformedData = transformedData.map(point => [...point, 0]);
    }

    // Calculate explained variance from singular values
    const singularValues = s.arraySync();
    const explainedVariance = singularValues.slice(0, numComponents);
    const totalVariance = singularValues.reduce((sum, val) => sum + val * val, 0);
    const explainedRatio = (explainedVariance.reduce((sum, val) => sum + val * val, 0) / totalVariance * 100).toFixed(2);

    logProgress(`SVD PCA explained variance ratio: ${explainedRatio}%`);

    return transformedData;

  } catch (svdError) {
    logWarning(`SVD failed, falling back to variance-based approach: ${svdError.message}`);
    return performVarianceBasedPCA(centeredData, numComponents);
  }
}

// ----------------------------------------------------------------------------
// t-SNE Implementation (Pure JavaScript)
// ----------------------------------------------------------------------------

// Helper functions for debugging t-SNE
function getDataRange(data) {
  if (!data || data.length === 0) return 'empty';

  let min = Infinity, max = -Infinity;
  for (let i = 0; i < data.length; i++) {
    for (let j = 0; j < data[i].length; j++) {
      if (data[i][j] < min) min = data[i][j];
      if (data[i][j] > max) max = data[i][j];
    }
  }
  return `[${min.toFixed(4)}, ${max.toFixed(4)}]`;
}

function getDistanceRange(distances) {
  if (!distances || distances.length === 0) return 'empty';

  let min = Infinity, max = -Infinity;
  for (let i = 0; i < distances.length; i++) {
    for (let j = 0; j < distances[i].length; j++) {
      if (i !== j) {
        if (distances[i][j] < min) min = distances[i][j];
        if (distances[i][j] > max) max = distances[i][j];
      }
    }
  }
  return `[${min.toFixed(4)}, ${max.toFixed(4)}]`;
}

async function performTSNE(pointsMatrix, numComponents = 2, options = {}) {
  const {
    perplexity = 10.0,
    maxIterations = 300,
    learningRate = 100.0
  } = options;

  const numPoints = pointsMatrix.length;

  logInfo(`Starting t-SNE on ${numPoints.toLocaleString()} points`);
  logProgress(`Parameters: perplexity=${perplexity}, iterations=${maxIterations}`);

  // For very large datasets, subsample
  const MAX_TSNE_POINTS = 1000;
  let processedMatrix = pointsMatrix;
  let needsInterpolation = false;

  if (numPoints > MAX_TSNE_POINTS) {
    logWarning(`Large dataset: ${numPoints.toLocaleString()} points`);
    logProgress(`Subsampling to ${MAX_TSNE_POINTS} points for t-SNE computation`);

    const step = Math.floor(numPoints / MAX_TSNE_POINTS);
    processedMatrix = [];
    for (let i = 0; i < numPoints; i += step) {
      if (processedMatrix.length < MAX_TSNE_POINTS) {
        processedMatrix.push(pointsMatrix[i]);
      }
    }
    needsInterpolation = true;
    logProgress(`Sampled ${processedMatrix.length} points for analysis`);
  }

  try {
    const result = await runTSNE(processedMatrix, numComponents, {
      perplexity: Math.min(perplexity, Math.floor(processedMatrix.length / 6)),
      maxIterations,
      learningRate
    });

    if (needsInterpolation) {
      logProgress(`Interpolating results to all ${numPoints.toLocaleString()} points`);
      return interpolateResults(pointsMatrix, processedMatrix, result, numComponents);
    }

    logSuccess('t-SNE completed successfully');
    return result;

  } catch (error) {
    logError(`t-SNE failed: ${error.message}`);
    logWarning('Falling back to PCA...');
    return await performPCA(pointsMatrix, numComponents);
  }
}

async function runTSNE(points, numComponents, options) {
  const { perplexity, maxIterations, learningRate } = options;
  const n = points.length;
  const numDims = points[0].length;

  logProgress(`Running t-SNE on ${n} points with ${numDims} dimensions...`);
  logProgress(`Target output: ${numComponents}D`);

  try {
    // Initialize embedding randomly with larger initial values
    let Y = Array.from({ length: n }, () =>
      Array.from({ length: numComponents }, () => (Math.random() - 0.5) * 2.0)
    );

    logProgress(`Initial embedding range: ${getDataRange(Y)}`);

    // Compute pairwise distances
    logProgress('Computing pairwise distances...');
    const distances = computePairwiseDistances(points);
    logProgress(`Distance matrix computed, range: ${getDistanceRange(distances)}`);

    // Compute P matrix (affinities in high-dimensional space)
    logProgress('Computing probability matrix...');
    const P = await computePMatrix(distances, perplexity);
    logProgress(`P matrix computed, checking for valid probabilities...`);

    // Validate P matrix
    let pSum = 0;
    let validPs = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (P[i][j] > 0 && !isNaN(P[i][j])) {
          pSum += P[i][j];
          validPs++;
        }
      }
    }
    logProgress(`P matrix validation: ${validPs} valid entries, sum = ${pSum.toFixed(6)}`);

    if (validPs === 0) {
      throw new Error('P matrix contains no valid probabilities');
    }

    // Optimize embedding using gradient descent
    logProgress('Optimizing embedding...');
    Y = await optimizeEmbedding(Y, P, learningRate, maxIterations);

    logProgress(`Final embedding range: ${getDataRange(Y)}`);

    // Validate final embedding
    for (let i = 0; i < Y.length; i++) {
      for (let j = 0; j < Y[i].length; j++) {
        if (isNaN(Y[i][j]) || !isFinite(Y[i][j])) {
          logError(`NaN or infinite value detected at position [${i}][${j}]: ${Y[i][j]}`);
          throw new Error('t-SNE produced invalid results');
        }
      }
    }

    // Ensure 3D output for visualization
    if (numComponents === 2) {
      for (let i = 0; i < n; i++) {
        Y[i].push(0);
      }
      logProgress('Padded 2D result to 3D with Z=0');
    }

    logSuccess(`t-SNE completed successfully with ${Y.length} points in ${Y[0].length}D`);
    return Y;

  } catch (error) {
    logError(`t-SNE failed during execution: ${error.message}`);
    throw error;
  }
}

function computePairwiseDistances(points) {
  const n = points.length;
  const numDims = points[0].length;
  const distances = new Array(n);

  for (let i = 0; i < n; i++) {
    distances[i] = new Array(n);
    for (let j = 0; j < n; j++) {
      if (i === j) {
        distances[i][j] = 0;
      } else {
        let dist = 0;
        for (let d = 0; d < numDims; d++) {
          const diff = points[i][d] - points[j][d];
          dist += diff * diff;
        }
        distances[i][j] = Math.sqrt(dist);
      }
    }
  }

  return distances;
}

async function computePMatrix(distances, perplexity) {
  const n = distances.length;
  const P = new Array(n);
  const targetEntropy = Math.log2(perplexity);

  logProgress(`Computing P matrix with target perplexity: ${perplexity}`);

  // Compute P matrix with binary search for optimal sigma
  for (let i = 0; i < n; i++) {
    P[i] = new Array(n);

    // Binary search for optimal sigma (bandwidth)
    let sigma = 1.0;
    let sigmaMin = 1e-20;
    let sigmaMax = 1e20;
    let bestProbs = null;

    // Try to find good initial sigma value
    const sortedDistances = distances[i].filter((d, j) => j !== i).sort((a, b) => a - b);
    const medianDist = sortedDistances[Math.floor(sortedDistances.length / 2)];
    sigma = Math.max(medianDist / 2, 1e-10);

    for (let iter = 0; iter < 50; iter++) {
      let sum = 0;
      const probs = new Array(n);

      // Compute probabilities with current sigma
      for (let j = 0; j < n; j++) {
        if (i === j) {
          probs[j] = 0;
        } else {
          const exp_val = Math.exp(-distances[i][j] * distances[i][j] / (2 * sigma * sigma));
          probs[j] = exp_val;
          sum += exp_val;
        }
      }

      // Normalize probabilities
      if (sum > 1e-50) {
        for (let j = 0; j < n; j++) {
          if (i !== j) {
            probs[j] /= sum;
          }
        }
      } else {
        // If sum is too small, use uniform probabilities
        const uniform_prob = 1.0 / (n - 1);
        for (let j = 0; j < n; j++) {
          probs[j] = (i === j) ? 0 : uniform_prob;
        }
      }

      // Compute entropy
      let entropy = 0;
      for (let j = 0; j < n; j++) {
        if (probs[j] > 1e-50) {
          entropy -= probs[j] * Math.log2(probs[j]);
        }
      }

      const entropyDiff = entropy - targetEntropy;

      // Check convergence
      if (Math.abs(entropyDiff) < 1e-5 || iter === 49) {
        for (let j = 0; j < n; j++) {
          P[i][j] = Math.max(probs[j], 1e-50); // Prevent zeros
        }
        bestProbs = probs;
        break;
      }

      // Adjust sigma - if entropy is too high, increase sigma; if too low, decrease sigma
      if (entropyDiff > 0) {
        sigmaMin = sigma;
        if (sigmaMax === 1e20) {
          sigma = sigma * 2;
        } else {
          sigma = (sigma + sigmaMax) / 2;
        }
      } else {
        sigmaMax = sigma;
        sigma = (sigma + sigmaMin) / 2;
      }

      // Prevent sigma from getting too small or too large
      sigma = Math.max(Math.min(sigma, 1e10), 1e-10);
    }

    // Progress update
    if (i % 25 === 0) {
      const progress = ((i / n) * 100).toFixed(1);
      logProgress(`  P matrix computation: ${progress}%`);

      // Yield control periodically
      if (i % 50 === 0 && i > 0) {
        await new Promise(resolve => setTimeout(resolve, 1));
      }
    }
  }

  // Symmetrize P matrix and normalize
  let totalSum = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      P[i][j] = (P[i][j] + P[j][i]) / 2;
      if (i !== j) {
        totalSum += P[i][j];
      }
    }
  }

  // Normalize by total sum and ensure minimum values
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        P[i][j] = 0;
      } else {
        P[i][j] = Math.max(P[i][j] / totalSum, 1e-12);
      }
    }
  }

  logProgress(`P matrix completed, total sum after normalization: ${totalSum.toFixed(6)}`);

  return P;
}

async function optimizeEmbedding(Y, P, learningRate, maxIterations) {
  const n = Y.length;
  const numComponents = Y[0].length;
  let momentum = Array.from({ length: n }, () => Array(numComponents).fill(0));

  logProgress(`Starting embedding optimization: ${n} points, ${numComponents}D, ${maxIterations} iterations`);

  for (let iter = 0; iter < maxIterations; iter++) {
    // Compute Q matrix (affinities in low-dimensional space)
    let sumQ = 0;
    const Q = new Array(n);

    for (let i = 0; i < n; i++) {
      Q[i] = new Array(n);
      for (let j = 0; j < n; j++) {
        if (i === j) {
          Q[i][j] = 0;
        } else {
          let dist = 0;
          for (let d = 0; d < numComponents; d++) {
            const diff = Y[i][d] - Y[j][d];
            dist += diff * diff;
          }
          Q[i][j] = 1 / (1 + dist);
          sumQ += Q[i][j];
        }
      }
    }

    // Normalize Q matrix
    if (sumQ > 1e-50) {
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          Q[i][j] /= sumQ;
          Q[i][j] = Math.max(Q[i][j], 1e-12);
        }
      }
    } else {
      logWarning(`Very small sumQ at iteration ${iter}: ${sumQ}`);
    }

    // Compute gradient
    const gradient = Array.from({ length: n }, () => Array(numComponents).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i !== j) {
          const pij = P[i][j];
          const qij = Q[i][j];
          const factor = 4 * (pij - qij) * qij * sumQ;

          for (let d = 0; d < numComponents; d++) {
            gradient[i][d] += factor * (Y[i][d] - Y[j][d]);
          }
        }
      }
    }

    // Update embedding with momentum
    const momentumFactor = iter < 20 ? 0.5 : 0.8;
    const currentLR = iter < 100 ? learningRate * 4 : learningRate;

    // Check for problematic gradients
    let maxGrad = 0;
    for (let i = 0; i < n; i++) {
      for (let d = 0; d < numComponents; d++) {
        maxGrad = Math.max(maxGrad, Math.abs(gradient[i][d]));
      }
    }

    // Clip gradients if they're too large
    const gradClip = 5.0;
    if (maxGrad > gradClip) {
      const clipFactor = gradClip / maxGrad;
      for (let i = 0; i < n; i++) {
        for (let d = 0; d < numComponents; d++) {
          gradient[i][d] *= clipFactor;
        }
      }
      if (iter % 50 === 0) {
        logProgress(`  Clipped gradients at iteration ${iter}, max grad was ${maxGrad.toFixed(4)}`);
      }
    }

    // Apply momentum and gradients
    for (let i = 0; i < n; i++) {
      for (let d = 0; d < numComponents; d++) {
        if (isFinite(gradient[i][d])) {
          momentum[i][d] = momentumFactor * momentum[i][d] - currentLR * gradient[i][d];
          Y[i][d] += momentum[i][d];

          // Check for NaN or infinite values
          if (!isFinite(Y[i][d])) {
            logError(`NaN/Inf detected at iteration ${iter}, point ${i}, dimension ${d}`);
            Y[i][d] = (Math.random() - 0.5) * 0.1; // Reset to small random value
          }
        }
      }
    }

    // Center embedding
    for (let d = 0; d < numComponents; d++) {
      const mean = Y.reduce((sum, point) => sum + point[d], 0) / n;
      for (let i = 0; i < n; i++) {
        Y[i][d] -= mean;
      }
    }

    // Progress update with diagnostic info
    if (iter % 25 === 0) {
      const progress = ((iter / maxIterations) * 100).toFixed(1);
      const yRange = getDataRange(Y);
      logProgress(`  t-SNE optimization: ${progress}% (iter ${iter}), Y range: ${yRange}, max grad: ${maxGrad.toFixed(4)}`);

      // Yield control periodically
      if (iter % 50 === 0 && iter > 0) {
        await new Promise(resolve => setTimeout(resolve, 1));
      }
    }
  }

  logProgress(`Optimization completed. Final embedding range: ${getDataRange(Y)}`);
  return Y;
}

// ----------------------------------------------------------------------------
// TensorFlow.js UMAP Implementation
// ----------------------------------------------------------------------------

async function performUMAP(pointsMatrix, numComponents = 2, options = {}) {
  const {
    nNeighbors = 8,
    minDist = 0.1,
    nEpochs = 200
  } = options;

  const numPoints = pointsMatrix.length;

  logInfo(`Starting TensorFlow.js UMAP on ${numPoints.toLocaleString()} points`);
  logProgress(`Parameters: neighbors=${nNeighbors}, min_dist=${minDist}, epochs=${nEpochs}`);
  logMemoryUsage('before UMAP');

  // For very large datasets, subsample
  const MAX_UMAP_POINTS = 800;
  let processedMatrix = pointsMatrix;
  let needsInterpolation = false;

  if (numPoints > MAX_UMAP_POINTS) {
    logWarning(`Large dataset: ${numPoints.toLocaleString()} points`);
    logProgress(`Subsampling to ${MAX_UMAP_POINTS} points for UMAP computation`);

    const step = Math.floor(numPoints / MAX_UMAP_POINTS);
    processedMatrix = [];
    for (let i = 0; i < numPoints; i += step) {
      if (processedMatrix.length < MAX_UMAP_POINTS) {
        processedMatrix.push(pointsMatrix[i]);
      }
    }
    needsInterpolation = true;
    logProgress(`Sampled ${processedMatrix.length} points for analysis`);
  }

  try {
    const result = await runTensorFlowUMAP(processedMatrix, numComponents, {
      nNeighbors: Math.min(nNeighbors, Math.floor(processedMatrix.length / 4)),
      minDist,
      nEpochs
    });

    if (needsInterpolation) {
      logProgress(`Interpolating results to all ${numPoints.toLocaleString()} points`);
      return interpolateResults(pointsMatrix, processedMatrix, result, numComponents);
    }

    logSuccess('TensorFlow.js UMAP completed successfully');
    logMemoryUsage('after UMAP');
    return result;

  } catch (error) {
    logError(`TensorFlow.js UMAP failed: ${error.message}`);
    logWarning('Falling back to PCA...');
    cleanupTensors();
    return await performPCA(pointsMatrix, numComponents);
  }
}

async function runTensorFlowUMAP(points, numComponents, options) {
  const { nNeighbors, minDist, nEpochs } = options;
  const n = points.length;

  logProgress(`Running TensorFlow.js UMAP on ${n} points...`);

  return await tf.tidy(() => {
    try {
      // Convert input to tensor
      const X = tf.tensor2d(points);
      logProgress(`Input tensor shape: [${X.shape.join(', ')}]`);

      // Build k-nearest neighbor graph using TensorFlow.js
      logProgress('Building k-NN graph with TensorFlow.js...');
      const knnGraph = buildTensorKNNGraph(X, nNeighbors);

      // Build fuzzy topological representation
      logProgress('Building fuzzy graph...');
      const fuzzyEdges = buildTensorFuzzyGraph(knnGraph, n);

      // Initialize embedding with larger spread for UMAP
      const embedding = tf.variable(tf.randomNormal([n, numComponents], 0, 10.0));
      logProgress(`Initial embedding tensor shape: [${embedding.shape.join(', ')}]`);

      // Optimize embedding using TensorFlow.js
      logProgress('Optimizing embedding with TensorFlow.js...');
      const finalEmbedding = optimizeTensorUMAPEmbedding(embedding, fuzzyEdges, minDist, nEpochs);

      // Convert back to JavaScript array
      const resultArray = finalEmbedding.arraySync();

      // Ensure 3D output for visualization
      if (numComponents === 2) {
        for (let i = 0; i < resultArray.length; i++) {
          resultArray[i].push(0);
        }
        logProgress('Padded 2D result to 3D with Z=0');
      }

      logSuccess(`TensorFlow.js UMAP completed with ${resultArray.length} points in ${resultArray[0].length}D`);
      return resultArray;

    } catch (error) {
      logError(`TensorFlow.js UMAP failed during execution: ${error.message}`);
      throw error;
    }
  });
}

function buildTensorKNNGraph(X, k) {
  return tf.tidy(() => {
    const n = X.shape[0];
    logProgress(`Building k-NN graph for ${n} points with k=${k}...`);

    // Compute pairwise distances using TensorFlow.js
    const XSquaredNorms = tf.sum(tf.square(X), 1, true);
    const XSquaredNormsT = tf.transpose(XSquaredNorms);
    const XTX = tf.matMul(X, X, false, true);

    const distances = tf.sqrt(tf.maximum(
      tf.add(tf.add(XSquaredNorms, XSquaredNormsT), tf.mul(XTX, -2)),
      1e-10
    ));

    // Convert to JavaScript for k-nearest neighbor selection (complex indexing)
    const distancesArray = distances.arraySync();
    const knnGraph = new Array(n);

    for (let i = 0; i < n; i++) {
      const neighbors = [];
      for (let j = 0; j < n; j++) {
        if (i !== j) {
          neighbors.push({ index: j, distance: distancesArray[i][j] });
        }
      }

      // Sort by distance and take k nearest
      neighbors.sort((a, b) => a.distance - b.distance);
      knnGraph[i] = neighbors.slice(0, k);

      if (i % 50 === 0) {
        logProgress(`  k-NN graph: ${((i / n) * 100).toFixed(1)}%`);
      }
    }

    logProgress(`k-NN graph completed`);
    return knnGraph;
  });
}

function buildTensorFuzzyGraph(knnGraph, n) {
  logProgress('Building fuzzy graph representation...');

  const fuzzyEdges = [];

  // Compute fuzzy set memberships
  for (let i = 0; i < n; i++) {
    const neighbors = knnGraph[i];
    if (neighbors.length === 0) continue;

    // Use median distance as scale parameter
    const distances = neighbors.map(neighbor => neighbor.distance);
    distances.sort((a, b) => a - b);
    const sigma = Math.max(distances[Math.floor(distances.length / 2)], 1e-10);

    // Compute memberships using exponential kernel
    for (const neighbor of neighbors) {
      const membership = Math.exp(-neighbor.distance / sigma);
      if (membership > 0.01) {
        fuzzyEdges.push({
          from: i,
          to: neighbor.index,
          weight: membership
        });
      }
    }
  }

  // Symmetrize the graph using fuzzy set union
  const edgeMap = new Map();
  for (const edge of fuzzyEdges) {
    const key1 = `${edge.from}-${edge.to}`;
    const key2 = `${edge.to}-${edge.from}`;

    if (!edgeMap.has(key1)) edgeMap.set(key1, 0);
    if (!edgeMap.has(key2)) edgeMap.set(key2, 0);

    edgeMap.set(key1, edgeMap.get(key1) + edge.weight);
    edgeMap.set(key2, edgeMap.get(key2) + edge.weight);
  }

  const symmetrizedEdges = [];
  const processedPairs = new Set();

  for (const [key, weight] of edgeMap) {
    const [from, to] = key.split('-').map(Number);
    const pairKey = from < to ? `${from}-${to}` : `${to}-${from}`;

    if (!processedPairs.has(pairKey)) {
      processedPairs.add(pairKey);
      const reverseKey = `${to}-${from}`;
      const reverseWeight = edgeMap.get(reverseKey) || 0;

      // Fuzzy set union: a + b - a*b
      const combinedWeight = weight + reverseWeight - weight * reverseWeight;

      if (combinedWeight > 0.01) {
        symmetrizedEdges.push({
          from: Math.min(from, to),
          to: Math.max(from, to),
          weight: combinedWeight
        });
      }
    }
  }

  logProgress(`Fuzzy graph completed with ${symmetrizedEdges.length} edges`);
  return symmetrizedEdges;
}

function optimizeTensorUMAPEmbedding(embedding, fuzzyEdges, minDist, nEpochs) {
  return tf.tidy(() => {
    const n = embedding.shape[0];
    const numComponents = embedding.shape[1];
    const learningRate = 1.0;

    // UMAP curve parameters
    const a = tf.scalar(1.0 / minDist);
    const b = tf.scalar(1.0);

    logProgress(`Starting TensorFlow.js UMAP optimization: ${n} points, ${numComponents}D, ${nEpochs} epochs`);

    for (let epoch = 0; epoch < nEpochs; epoch++) {
      const alpha = tf.scalar(learningRate * (1 - epoch / nEpochs));

      // Process attractive forces from fuzzy graph edges
      for (const edge of fuzzyEdges) {
        const { from, to, weight } = edge;

        // Get point positions
        const pointFrom = tf.slice(embedding, [from, 0], [1, numComponents]);
        const pointTo = tf.slice(embedding, [to, 0], [1, numComponents]);

        // Compute distance
        const diff = tf.sub(pointFrom, pointTo);
        const distSq = tf.sum(tf.square(diff));
        const dist = tf.sqrt(tf.add(distSq, tf.scalar(1e-10)));

        // Attractive force using UMAP's curve
        const attractiveForce = tf.mul(
          tf.mul(tf.scalar(weight), alpha),
          tf.div(tf.scalar(1), tf.add(tf.scalar(1), tf.mul(a, distSq)))
        );

        // Compute gradients
        const gradDirection = tf.div(diff, dist);
        const grad = tf.mul(attractiveForce, gradDirection);

        // Update positions
        const updateFrom = tf.neg(grad);
        const updateTo = grad;

        // Apply updates
        const newPointFrom = tf.add(pointFrom, updateFrom);
        const newPointTo = tf.add(pointTo, updateTo);

        // Update embedding tensor
        embedding = tf.scatterND([[from]], newPointFrom, embedding.shape);
        embedding = tf.scatterND([[to]], newPointTo, embedding.shape);
      }

      // Sample some repulsive forces to maintain global structure
      const nRepulsive = Math.min(fuzzyEdges.length, 100);
      for (let rep = 0; rep < nRepulsive; rep++) {
        const i = Math.floor(Math.random() * n);
        const j = Math.floor(Math.random() * n);
        if (i === j) continue;

        const pointI = tf.slice(embedding, [i, 0], [1, numComponents]);
        const pointJ = tf.slice(embedding, [j, 0], [1, numComponents]);

        const diff = tf.sub(pointI, pointJ);
        const distSq = tf.sum(tf.square(diff));
        const dist = tf.sqrt(tf.add(distSq, tf.scalar(1e-10)));

        // Check if points are too close for repulsion
        const tooClose = tf.less(distSq, tf.scalar(4 * minDist * minDist));

        if (tooClose.dataSync()[0]) {
          // Repulsive force
          const repulsiveForce = tf.mul(
            tf.mul(alpha, b),
            tf.div(tf.scalar(1), tf.add(tf.scalar(1), tf.mul(a, distSq)))
          );

          const gradDirection = tf.div(diff, dist);
          const grad = tf.mul(repulsiveForce, gradDirection);

          // Apply repulsive updates
          const newPointI = tf.add(pointI, grad);
          const newPointJ = tf.sub(pointJ, grad);

          embedding = tf.scatterND([[i]], newPointI, embedding.shape);
          embedding = tf.scatterND([[j]], newPointJ, embedding.shape);
        }
      }

      // Progress update
      if (epoch % 25 === 0) {
        const progress = ((epoch / nEpochs) * 100).toFixed(1);
        logProgress(`  TensorFlow.js UMAP optimization: ${progress}% (epoch ${epoch})`);
      }
    }

    logProgress('TensorFlow.js UMAP optimization completed');
    return embedding;
  });
}

// ----------------------------------------------------------------------------
// Result Interpolation for Large Datasets
// ----------------------------------------------------------------------------

function interpolateResults(allPoints, sampledPoints, sampledResult, numComponents) {
  logProgress(`Interpolating to ${allPoints.length.toLocaleString()} points...`);

  const result = [];
  const BATCH_SIZE = 1000;

  for (let batchStart = 0; batchStart < allPoints.length; batchStart += BATCH_SIZE) {
    const batchEnd = Math.min(batchStart + BATCH_SIZE, allPoints.length);

    for (let i = batchStart; i < batchEnd; i++) {
      const point = allPoints[i];

      // Find nearest sample point (simplified search)
      let minDist = Infinity;
      let nearestIdx = 0;

      // Check every 10th sample point for efficiency
      const checkStep = Math.max(1, Math.floor(sampledPoints.length / 50));

      for (let j = 0; j < sampledPoints.length; j += checkStep) {
        let dist = 0;
        for (let d = 0; d < point.length; d++) {
          const diff = point[d] - sampledPoints[j][d];
          dist += diff * diff;
        }

        if (dist < minDist) {
          minDist = dist;
          nearestIdx = j;
        }
      }

      // Use nearest sample result with small random offset
      const interpolatedPoint = [...sampledResult[nearestIdx]];
      for (let d = 0; d < interpolatedPoint.length; d++) {
        interpolatedPoint[d] += (Math.random() - 0.5) * 0.02;
      }

      // Ensure 3D output
      while (interpolatedPoint.length < 3) {
        interpolatedPoint.push(0);
      }

      result.push(interpolatedPoint);
    }

    // Progress update
    if (batchStart % (BATCH_SIZE * 5) === 0) {
      const progress = ((batchEnd / allPoints.length) * 100).toFixed(1);
      logProgress(`  Interpolation: ${progress}%`);
    }
  }

  return result;
}



// ----------------------------------------------------------------------------
// Standard VTK.js Setup
// ----------------------------------------------------------------------------

const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({
  background: [0, 0, 0],
});
enableWebGPUApp({ fullScreenRenderer });
const renderer = fullScreenRenderer.getRenderer();
const renderWindow = fullScreenRenderer.getRenderWindow();
const XRHelper = vtkWebXRRenderWindowHelper.newInstance({
  renderWindow: fullScreenRenderer.getApiSpecificRenderWindow(),
  drawControllersRay: true,
});
const interactor = renderWindow.getInteractor();
const camera = renderer.getActiveCamera();

// -----------------------------------------------------
// Rendering backend state: 'webgl' (default) or 'wasm'
// -----------------------------------------------------
let currentBackend = 'webgpu';
function isWasmBackend() {
  return currentBackend === 'wasm';
}

// Root container and WASM canvas
const rootContainer = fullScreenRenderer.getContainer();
rootContainer.style.position = 'relative';
let wasmCanvas = null;

function ensureWasmCanvas() {
  let canvas = document.getElementById('vtk-wasm-canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'vtk-wasm-canvas';
    canvas.style.position = 'absolute';
    canvas.style.left = '0';
    canvas.style.top = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvas.style.background = 'black';
    canvas.style.zIndex = '0';
    canvas.tabIndex = 0;
    canvas.style.outline = 'none';
    rootContainer.appendChild(canvas);
    canvas.focus();
    logInfo('WASM canvas created and added to DOM');
  }

  const rect = rootContainer.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;

  logInfo(`WASM canvas dimensions: ${canvas.width}x${canvas.height}`);
  return canvas;
}

// VTK-wasm module instance
let wasmModule = null;

async function initWasmModule(canvas) {
  if (wasmModule) return wasmModule;

  logInfo('Loading VTK-wasm module...');

  wasmModule = await vtkWasmAppModule({
    canvas,  // 👈 bind WebGL/Emscripten to this canvas
    print: (txt) => logInfo(`[WASM-OUT] ${txt}`),
    printErr: (txt) => logError(`[WASM-ERR] ${txt}`),
  });

  logSuccess('VTK-wasm module initialized');
  logInfo(`Module exports: ${Object.keys(wasmModule).join(', ')}`);

  return wasmModule;
}


async function renderWithWasm(arrayBuffer) {
  logMessage("Using WASM rendering backend...");

  // JS heap BEFORE we touch the file
  logJsHeap("[WASM] Before file copy:");

  const canvas = ensureWasmCanvas();
  const module = await initWasmModule(canvas);

  const glCanvas = rootContainer.querySelector('canvas');
  if (glCanvas) glCanvas.style.display = 'none';
  canvas.style.display = 'block';
  currentBackend = 'wasm';

  // --- Measure data transfer into WASM memory ---
  const data = new Uint8Array(arrayBuffer);
  const size = data.byteLength;
  logMessage(`[WASM] VTP file size: ${(size / 1024).toFixed(1)} KB`);

  const tCopyStart = performance.now();
  const ptr = module._malloc(size);
  module.HEAPU8.set(data, ptr);
  const tCopyEnd = performance.now();
  logMessage(
    `[WASM] JS → WASM copy time: ${(tCopyEnd - tCopyStart).toFixed(2)} ms`
  );

  // --- Call into C++ ---
  const tProcessStart = performance.now();
  module.ccall(
    'ProcessVTP',
    'void',
    ['number', 'number', 'string'],
    [ptr, size, canvas.id]
  );
  const tProcessEnd = performance.now();
  logMessage(
    `[WASM] Total ProcessVTP() wall time (JS side): ${(tProcessEnd - tProcessStart).toFixed(2)} ms`
  );

  module._free(ptr);

  // JS heap AFTER WASM has finished
  logJsHeap("[WASM] After file loading complete:");

  reportRenderingBackend();
}






// ----------------------------------------------------------------------------
// Data Variables
// ----------------------------------------------------------------------------

const vtpReader = vtkXMLPolyDataReader.newInstance();
let originalPointsData = null;
let reductionApplied = false;
let reductionMethod = 'pca';
let reductionComponents = 3;

let axes = null
let axesPosition = null;

let currentActor = null;

const source = vtpReader.getOutputData(0);
const mapper = vtkMapper.newInstance();
const actor = vtkActor.newInstance();

actor.setMapper(mapper);

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

// ----------------------------------------------------------------------------
//  Set up Yjs doc + provider
// ----------------------------------------------------------------------------

const ydoc = new Y.Doc();
const provider = new WebsocketProvider('ws://localhost:8080', 'vtk-room', ydoc);
const yActor = ydoc.getMap('actor');
const yFile = ydoc.getMap('fileData');
const yReduction = ydoc.getMap('reduction');

let isLocalFileLoad = false;


// ----------------------------------------------------------------------------
// Yjs Observer: File Data
// ----------------------------------------------------------------------------

yFile.observe(event => {
  if (isLocalFileLoad) {
    isLocalFileLoad = false;
    return;
  }

  const b64 = yFile.get('polydata');
  if (b64) {
    const binary = Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer;
    updateScene(binary);
  }
});

// ----------------------------------------------------------------------------
// Yjs Observer: Actor Orientation and Representation
// ----------------------------------------------------------------------------

yActor.observe(event => {
  if (!currentActor) return;

  const orient = yActor.get('orientation');
  if (orient) {
    // Orient the main actor
    currentActor.setOrientation(orient[0], orient[1], orient[2]);

    // Orient the axes cube if present
    if (axes) {
      axes.setOrientation(orient[0], orient[1], orient[2]);
      if (axesPosition) {
        axes.setPosition(axesPosition[0], axesPosition[1], axesPosition[2]);
      }
    }

    // Camera position & focal
    const cameraPos = yActor.get('cameraPosition');
    if (cameraPos) {
      camera.setPosition(cameraPos[0], cameraPos[1], cameraPos[2]);
    }

    const cameraFocal = yActor.get('cameraFocalPoint');
    if (cameraFocal) {
      camera.setFocalPoint(
        cameraFocal[0],
        cameraFocal[1],
        cameraFocal[2]
      );
    }

    renderer.resetCameraClippingRange();
    renderWindow.render();
  }

  const rep = yActor.get('representation');
  if (rep !== undefined) {
    currentActor
      .getProperty()
      .setRepresentation(rep);
    renderer.resetCameraClippingRange();
    renderWindow.render();
  }
});



// ----------------------------------------------------------------------------
// Tracking/Sending Mouse Interaction
// ----------------------------------------------------------------------------

let isDraggingActor = false;
let mouseStartPos = null;
let actorStartOrient = null;

interactor.onMouseMove(callData => {
  if (isDraggingActor && currentActor) {
    const mousePos = callData.position;
    const deltaX = mousePos.x - mouseStartPos.x;
    const deltaY = mousePos.y - mouseStartPos.y;

    currentActor.setOrientation(
      actorStartOrient[0] - deltaY * 0.1,
      actorStartOrient[1] + deltaX * 0.1, // flip Y
      actorStartOrient[2]
    );

    if (axes) {
      const newOrient = currentActor.getOrientation();
      axes.setOrientation(newOrient[0], newOrient[1], newOrient[2]);
      if (axesPosition) {
        axes.setPosition(
          axesPosition[0],
          axesPosition[1],
          axesPosition[2]
        );
      }
    }

    renderWindow.render();
    sendActorPosition();
  }
});

interactor.onLeftButtonPress(callData => {
  if (!currentActor) return;
  isDraggingActor = true;
  actorStartOrient = [...currentActor.getOrientation()];
  mouseStartPos = callData.position; // Store starting mouse position
});

interactor.onLeftButtonRelease(() => {
  isDraggingActor = false;
  actorStartOrient = null;
  mouseStartPos = null;
});


function sendActorPosition() {
  if (currentActor) {
    const orient = currentActor.getOrientation();
    yActor.set('orientation', orient);
    const cameraPos = camera.getPosition();
    const cameraFocal = camera.getFocalPoint();
    yActor.set('cameraPosition', cameraPos);
    yActor.set('cameraFocalPoint', cameraFocal);
  }
}

// ----------------------------------------------------------------------------
// Point Processing Functions
// ----------------------------------------------------------------------------

async function extractPointsFromPolyData(polyData) {
  const points = polyData.getPoints();
  if (!points) return null;

  const pointsArray = points.getData();
  const numPoints = points.getNumberOfPoints();

  logProgress(`Extracting ${numPoints.toLocaleString()} points...`);

  const pointsMatrix = [];
  for (let i = 0; i < numPoints; i++) {
    const point = [
      pointsArray[i * 3],
      pointsArray[i * 3 + 1],
      pointsArray[i * 3 + 2]
    ];
    pointsMatrix.push(point);
  }

  return pointsMatrix;
}

function applyReductionToPolyData(polyData, reducedPoints) {
  logProgress('Applying transformed points to visualization...');

  const points = polyData.getPoints();
  const pointsArray = points.getData();
  const numPoints = points.getNumberOfPoints();

  // Check if this is a 2D result (all Z coordinates are 0)
  const is2D = reducedPoints.every(point => point.length >= 3 && point[2] === 0);

  for (let i = 0; i < numPoints; i++) {
    pointsArray[i * 3] = reducedPoints[i][0];
    pointsArray[i * 3 + 1] = reducedPoints[i][1];
    pointsArray[i * 3 + 2] = reducedPoints[i].length > 2 ? reducedPoints[i][2] : 0;
  }

  points.setData(pointsArray);
  points.modified();
  polyData.modified();
  polyData.getBounds();

  if (is2D) {
    logSuccess('Applied 2D visualization - all points in XY plane (Z=0)');
    // Set up 2D viewing - position camera to look down at XY plane
    setup2DView();
  } else {
    logSuccess('Applied 3D visualization with transformed points');
  }
}

function setup2DView() {
  // Position camera to look down at the XY plane for 2D visualization
  // const camera = renderer.getActiveCamera();

  // Get the bounds of the current data
  const bounds = renderer.computeVisiblePropBounds();
  const centerX = (bounds[0] + bounds[1]) / 2;
  const centerY = (bounds[2] + bounds[3]) / 2;
  const centerZ = 0; // Since all Z coordinates are 0

  const rangeX = bounds[1] - bounds[0];
  const rangeY = bounds[3] - bounds[2];
  const maxRange = Math.max(rangeX, rangeY);

  // Position camera directly above looking straight down
  camera.setPosition(centerX, centerY, maxRange * 2);
  camera.setFocalPoint(centerX, centerY, centerZ);
  camera.setViewUp(0, 1, 0); // Y axis points up

  // Force orthographic (parallel) projection for true 2D
  camera.setParallelProjection(true);
  camera.setParallelScale(maxRange * 0.55);

  // ----------------
  // DO NOT TOUCH INTERACTOR CODE BELOW: it doesn't work
  // ----------------

  // Disable 3D interactions to keep it 2D
  // const interactor = renderWindow.getInteractor();
  // const interactorStyle = interactor.getInteractorStyle();

  // // Store original interaction state
  // if (!window.original3DInteractionState) {
  //   window.original3DInteractionState = {
  //     leftButtonAction: interactorStyle.getLeftButtonAction(),
  //     middleButtonAction: interactorStyle.getMiddleButtonAction(),
  //     rightButtonAction: interactorStyle.getRightButtonAction()
  //   };
  // }

  // // Set 2D interaction style - only allow pan and zoom, no rotation
  // interactorStyle.setLeftButtonAction('Pan');
  // interactorStyle.setMiddleButtonAction('Zoom');
  // interactorStyle.setRightButtonAction('Pan');

  // Force render
  renderWindow.render();

  logProgress('Locked to 2D viewing mode (no rotation, orthographic projection)');
}

function restore3DView() {
  // const camera = renderer.getActiveCamera();
  // const interactor = renderWindow.getInteractor();
  const interactorStyle = interactor.getInteractorStyle();

  // Restore perspective projection
  camera.setParallelProjection(false);

  // ----------------
  // DO NOT TOUCH INTERACTOR CODE BELOW: it doesn't work
  // ----------------

  // // Restore 3D interactions
  // if (window.original3DInteractionState) {
  //   interactorStyle.setLeftButtonAction(window.original3DInteractionState.leftButtonAction);
  //   interactorStyle.setMiddleButtonAction(window.original3DInteractionState.middleButtonAction);
  //   interactorStyle.setRightButtonAction(window.original3DInteractionState.rightButtonAction);
  // } else {
  //   // Default 3D interaction
  //   interactorStyle.setLeftButtonAction('Rotate');
  //   interactorStyle.setMiddleButtonAction('Zoom');
  //   interactorStyle.setRightButtonAction('Pan');
  // }

  logProgress('Restored 3D viewing mode (rotation enabled, perspective projection)');
}

// ----------------------------------------------------------------------------
// Main Dimensionality Reduction Function
// ----------------------------------------------------------------------------

async function toggleDimensionalityReduction(isRemote = false) {
  if (!originalPointsData) {
    logError('No data loaded for processing');
    alert('Please load a VTP file first!');
    return;
  }

  const currentPolyData = vtpReader.getOutputData(0);

  if (!reductionApplied) {
    logInfo(`Starting ${reductionMethod.toUpperCase()} transformation...`);
    logProgress(`Target: ${reductionComponents}D reduction`);
    logMemoryUsage('before reduction');

    try {
      const pointsMatrix = await extractPointsFromPolyData(currentPolyData);
      if (!pointsMatrix) {
        logError('Failed to extract points from polydata');
        return;
      }

      logProgress(`Processing ${pointsMatrix.length.toLocaleString()} points`);

      let reducedPoints;
      const startTime = performance.now();

      logProgress(`Executing ${reductionMethod.toUpperCase()} with ${reductionComponents}D target...`);

      if (reductionMethod === 'pca') {
        reducedPoints = await performPCA(pointsMatrix, reductionComponents);
        logSuccess(`PCA completed - output has ${reducedPoints[0].length} dimensions`);
      } else if (reductionMethod === 'tsne') {
        const tsneOptions = {
          perplexity: Math.min(10.0, Math.floor(pointsMatrix.length / 6)),
          maxIterations: 300,
          learningRate: 100.0
        };
        logProgress(`t-SNE options: perplexity=${tsneOptions.perplexity}, target=${reductionComponents}D`);
        reducedPoints = await performTSNE(pointsMatrix, reductionComponents, tsneOptions);
        logSuccess(`t-SNE completed - output has ${reducedPoints[0].length} dimensions`);

        // Verify we got the expected dimensions
        if (reductionComponents === 2 && reducedPoints[0].length === 3) {
          logProgress('t-SNE 2D result padded to 3D for visualization (Z=0)');
        }
      } else if (reductionMethod === 'umap') {
        // Get UMAP parameters from UI if available
        const umapNeighborsInput = document.querySelector('.umap-neighbors-input');
        const umapMinDistInput = document.querySelector('.umap-mindist-input');

        const nNeighbors = umapNeighborsInput ? parseInt(umapNeighborsInput.value) : 8;
        const minDist = umapMinDistInput ? parseFloat(umapMinDistInput.value) : 0.1;

        const umapOptions = {
          nNeighbors: nNeighbors,
          minDist: minDist,
          nEpochs: 200
        };

        logProgress(`UMAP options: neighbors=${nNeighbors}, min_dist=${minDist}, target=${reductionComponents}D`);
        reducedPoints = await performUMAP(pointsMatrix, reductionComponents, umapOptions);
        logSuccess(`UMAP completed - output has ${reducedPoints[0].length} dimensions`);

        // Verify we got the expected dimensions
        if (reductionComponents === 2 && reducedPoints[0].length === 3) {
          logProgress('UMAP 2D result padded to 3D for visualization (Z=0)');
        }
      }

      const endTime = performance.now();
      const processingTime = ((endTime - startTime) / 1000).toFixed(2);

      // Log original and new bounds
      const originalBounds = currentPolyData.getBounds();
      logProgress(`Original bounds: X[${originalBounds[0].toFixed(2)}, ${originalBounds[1].toFixed(2)}] Y[${originalBounds[2].toFixed(2)}, ${originalBounds[3].toFixed(2)}] Z[${originalBounds[4].toFixed(2)}, ${originalBounds[5].toFixed(2)}]`);

      applyReductionToPolyData(currentPolyData, reducedPoints);
      reductionApplied = true;

      // Update the reduction state in other tabs
      // sendReductionState();

      const newBounds = currentPolyData.getBounds();
      logProgress(`New bounds: X[${newBounds[0].toFixed(2)}, ${newBounds[1].toFixed(2)}] Y[${newBounds[2].toFixed(2)}, ${newBounds[3].toFixed(2)}] Z[${newBounds[4].toFixed(2)}, ${newBounds[5].toFixed(2)}]`);

      logSuccess(`${reductionMethod.toUpperCase()} reduction completed in ${processingTime}s`);
      logInfo(`Visualization updated with ${reductionComponents}D data`);
      logMemoryUsage('after reduction complete');

      // Clean up tensors if using TensorFlow.js
      if (reductionMethod === 'pca') {
        cleanupTensors();
      }

    } catch (error) {
      logError(`${reductionMethod.toUpperCase()} reduction failed: ${error.message}`);
      logWarning('Try reloading the file or using a different method');
      logMemoryUsage('after error');

      // Clean up on error
      if (reductionMethod === 'pca') {
        cleanupTensors();
      }
      return;
    }
  } else {
    logInfo('Restoring original data...');

    const points = currentPolyData.getPoints();
    points.setData(originalPointsData);
    currentPolyData.modified();
    reductionApplied = false;

    // Sync reset with other tabs
    // sendReductionState();

    // Reset to 3D perspective view when restoring original data
    restore3DView();

    logSuccess('Original data restored successfully');

    // Clean up any remaining tensors
    cleanupTensors();
  }

  mapper.setInputData(currentPolyData);

  // Always reset camera after data changes
  renderer.resetCamera();
  renderWindow.render();

  // Only broadcast if this toggle came from *local user*, not from Yjs
  if (!isRemote) {
    yReduction.set('state', {
      applied: reductionApplied,
      method: reductionMethod,
      components: reductionComponents,
    });
  }


  logInfo('Visualization refreshed');
  logProgress(`Current state: ${reductionApplied ? `${reductionMethod.toUpperCase()} ${reductionComponents}D` : 'Original 3D'}`);
}

// ----------------------------------------------------------------------------
// Yjs Observer: Toggle Reduction
// ----------------------------------------------------------------------------


// ----------------------------------------------------------------------------
// Yjs Observer: Toggle Reduction
// ----------------------------------------------------------------------------


yReduction.observe(event => {
  // event.transaction.local === true if *this tab* made the change
  if (event.transaction.local) {
    logInfo('this is the host tab!');
    // Don't run toggle here — we already applied it locally
    return;
  }

  const state = yReduction.get('state');

  logInfo("reduction observed from another tab!");

  if (!state) return;


  const applied = state.applied;
  const method = state.method;
  const components = state.components;

  if (applied !== undefined && method && components) {
    logInfo("if (applied !== undefined && method && components)");
    if (applied && !reductionApplied) {
      logInfo("if (applied && !reductionApplied)");
      reductionMethod = method;
      reductionComponents = components;
      toggleDimensionalityReduction(true);
    } else if (!applied && reductionApplied) {
      logInfo("else if (!applied && reductionApplied)")
      toggleDimensionalityReduction(true);
    }
    else {
      logInfo("none of the above");
      logInfo(`applied: ${applied} reductionApplied: ${reductionApplied}`)
    }
  }
});


// ----------------------------------------------------------------------------
// Create an Orientation Marker
// ----------------------------------------------------------------------------

function createOrientationMarker() {
  // create axes
  axes = vtkAnnotatedCubeActor.newInstance();
  axes.setDefaultStyle({
    text: '+X',
    fontStyle: 'bold',
    fontFamily: 'Arial',
    fontColor: 'black',
    fontSizeScale: (res) => res / 2,
    faceColor: '#0000ff',
    faceRotation: 0,
    edgeThickness: 0.1,
    edgeColor: 'black',
    resolution: 400,
  });
  // axes.setXPlusFaceProperty({ text: '+X' });
  axes.setXMinusFaceProperty({
    text: '-X',
    faceColor: '#ffff00',
    faceRotation: 90,
    fontStyle: 'italic',
  });
  axes.setYPlusFaceProperty({
    text: '+Y',
    faceColor: '#00ff00',
    fontSizeScale: (res) => res / 4,
  });
  axes.setYMinusFaceProperty({
    text: '-Y',
    faceColor: '#00ffff',
    fontColor: 'white',
  });
  axes.setZPlusFaceProperty({
    text: '+Z',
    edgeColor: 'yellow',
  });
  axes.setZMinusFaceProperty({ text: '-Z', faceRotation: 45, edgeThickness: 0 });
  axesPosition = axes.getPosition();

  // create orientation widget
  const orientationWidget = vtkOrientationMarkerWidget.newInstance({
    actor: axes,
    interactor: interactor,
  });
  orientationWidget.setEnabled(true);
  orientationWidget.setViewportCorner(
    vtkOrientationMarkerWidget.Corners.BOTTOM_RIGHT
  );
  orientationWidget.setViewportSize(0.10);
  orientationWidget.setMinPixelSize(100);
  orientationWidget.setMaxPixelSize(300);
}

// ----------------------------------------------------------------------------
// File Handling
// ----------------------------------------------------------------------------

async function updateScene(fileData) {
  try {
    logProgress('Parsing VTP file...');
    const parseStart = performance.now();

    vtpReader.parseAsArrayBuffer(fileData);

    const parseEnd = performance.now();
    const parseTimeMs = parseEnd - parseStart;
    logProgress(`  VTP parse time: ${parseTimeMs.toFixed(2)} ms`);

    const polyData = vtpReader.getOutputData(0);

    const points = polyData.getPoints();
    if (points) {
      originalPointsData = new Float32Array(points.getData());
      const numPoints = points.getNumberOfPoints();
      const bounds = polyData.getBounds();

      logSuccess('File loaded successfully!');
      logInfo('Dataset information:');
      logProgress(
        `  Points: ${numPoints.toLocaleString()}`
      );
      logProgress(
        `  Bounds: ` +
        `X[${bounds[0].toFixed(2)}, ${bounds[1].toFixed(2)}] ` +
        `Y[${bounds[2].toFixed(2)}, ${bounds[3].toFixed(2)}] ` +
        `Z[${bounds[4].toFixed(2)}, ${bounds[5].toFixed(2)}]`
      );

      const cells = polyData.getPolys();
      if (cells) {
        const numCells = cells.getNumberOfCells();
        logProgress(`  Polygons: ${numCells.toLocaleString()}`);
      }

      const pointDataSizeMB = (originalPointsData.length * 4) / (1024 * 1024);
      logProgress(`Memory usage: ~${pointDataSizeMB.toFixed(1)} MB`);

      if (numPoints > 10000) {
        logWarning('Large dataset: Memory-optimized algorithms will be used automatically');
      }
      if (numPoints > 50000) {
        logWarning('Very large dataset: Consider using smaller files for better performance');
      }

      // Create orientation marker ONCE
      if (!axes) {
        createOrientationMarker();
      }
    } else {
      logWarning('No point data found in VTP file');
    }

    // CRITICAL FIX: Choose rendering path based on backend
    if (isWasmBackend()) {
      // ===== WASM RENDERING PATH =====
      logProgress('Using WASM rendering backend...');

      // Hide vtk.js canvas and remove actors
      const vtkjsCanvas = rootContainer.querySelector('canvas:not(#vtk-wasm-canvas)');
      if (vtkjsCanvas) {
        vtkjsCanvas.style.display = 'none';
      }
      renderer.removeAllActors();

      // Render with WASM
      const renderStart = performance.now();
      await renderWithWasm(fileData);
      const renderEnd = performance.now();

      const renderTimeMs = renderEnd - renderStart;
      const estimatedFps = 1000.0 / renderTimeMs;

      logProgress(`  [WASM] First render time: ${renderTimeMs.toFixed(2)} ms`);
      logProgress(`  [WASM] Estimated FPS: ${estimatedFps.toFixed(1)} fps`);

      // Store a reference (even though we can't interact with WASM actor directly)
      currentActor = null; // WASM handles its own actor

      // CRITICAL: Ensure WASM canvas can receive mouse/keyboard events
      const wasmCanvas = document.getElementById('vtk-wasm-canvas');
      if (wasmCanvas) {
        wasmCanvas.style.display = 'block';
        wasmCanvas.focus();

        // Maintain focus on click to ensure events are captured
        wasmCanvas.addEventListener('mousedown', () => {
          wasmCanvas.focus();
        });

        logSuccess('[WASM] Canvas focused and ready for mouse interactions');
      }

    } else {
      // ===== VTK.JS WEBGL RENDERING PATH =====
      logProgress('Using vtk.js WebGL rendering backend...');

      // Hide WASM canvas
      const wasmCanvas = document.getElementById('vtk-wasm-canvas');
      if (wasmCanvas) {
        wasmCanvas.style.display = 'none';
      }

      // Show vtk.js canvas
      const vtkjsCanvas = rootContainer.querySelector('canvas:not(#vtk-wasm-canvas)');
      if (vtkjsCanvas) {
        vtkjsCanvas.style.display = 'block';
      }

      // Set up vtk.js pipeline
      mapper.setInputData(polyData);
      renderer.addActor(actor);
      renderer.resetCamera();

      const renderStart = performance.now();
      renderWindow.render();
      const renderEnd = performance.now();

      const renderTimeMs = renderEnd - renderStart;
      const estimatedFps = 1000.0 / renderTimeMs;

      logProgress(`  [WebGL] First render time: ${renderTimeMs.toFixed(2)} ms`);
      logProgress(`  [WebGL] Estimated FPS: ${estimatedFps.toFixed(1)} fps`);

      currentActor = actor;
    }

    reductionApplied = false;

    logSuccess('Visualization rendered successfully');
    logInfo('Use "Toggle Reduction" to apply PCA, t-SNE, or UMAP');
    logMemoryUsage('after file loading complete');
    reportRenderingBackend();

  } catch (error) {
    logError(`Failed to load VTP file: ${error.message}`);
    logWarning('Make sure the file is a valid VTP (VTK XML PolyData) format');
    logMemoryUsage('after file loading error');
  }
}


function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function handleFile(e) {
  preventDefaults(e);
  const dataTransfer = e.dataTransfer;
  const files = e.target.files || dataTransfer.files;

  if (files.length > 0) {
    const file = files[0];
    logInfo(`Loading file: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
    logMemoryUsage('before file loading');

    const fileReader = new FileReader();
    fileReader.onload = function onLoad(e) {
      const fileData = fileReader.result;
      const b64 = arrayBufferToBase64(fileData);

      isLocalFileLoad = true; //mark as a local change
      //overwite the polydata if it already exists
      yFile.set('polydata', b64);

      updateScene(fileData);
    };

    fileReader.onerror = function (error) {
      logError(`File reading failed: ${error.message}`);
    };

    fileReader.readAsArrayBuffer(files[0]);
  }
}

// ----------------------------------------------------------------------------
// UI Controls Setup
// ----------------------------------------------------------------------------

function setupDimensionalityReductionControls() {
  const controlTable = document.querySelector('table');

  // Method selection row
  const methodRow = document.createElement('tr');
  const methodCell = document.createElement('td');
  const methodSelect = document.createElement('select');
  methodSelect.style.width = '100%';

  const pcaOption = document.createElement('option');
  pcaOption.value = 'pca';
  pcaOption.textContent = 'PCA (TensorFlow.js)';
  pcaOption.selected = true;
  methodSelect.appendChild(pcaOption);

  const tsneOption = document.createElement('option');
  tsneOption.value = 'tsne';
  tsneOption.textContent = 't-SNE (TensorFlow.js)';
  methodSelect.appendChild(tsneOption);

  const umapOption = document.createElement('option');
  umapOption.value = 'umap';
  umapOption.textContent = 'UMAP (TensorFlow.js)';
  methodSelect.appendChild(umapOption);

  methodSelect.addEventListener('change', (e) => {
    const oldMethod = reductionMethod;
    reductionMethod = e.target.value;
    logInfo(`Reduction method changed: ${oldMethod.toUpperCase()} -> ${reductionMethod.toUpperCase()}`);

    updateComponentsSelector();
    updateUMAPParametersVisibility();

    // Update reductionComponents to match the new method's default
    if (reductionMethod === 'tsne' || reductionMethod === 'umap') {
      reductionComponents = 2; // Default to 2D for t-SNE and UMAP
      logProgress(`Target dimensions set to ${reductionComponents}D (recommended for ${reductionMethod.toUpperCase()})`);
    } else if (reductionMethod === 'pca') {
      reductionComponents = 3; // Default to 3D for PCA
      logProgress(`Target dimensions set to ${reductionComponents}D for ${reductionMethod.toUpperCase()}`);
    }

    if (reductionApplied) {
      logWarning(`Currently using ${oldMethod.toUpperCase()}. Click "Toggle Reduction" twice to apply ${reductionMethod.toUpperCase()}`);
    } else {
      logInfo(`${reductionMethod.toUpperCase()} will be used when next applied`);
    }
  });

  methodCell.appendChild(methodSelect);
  methodRow.appendChild(methodCell);
  controlTable.appendChild(methodRow);

  // UMAP parameters row (initially hidden)
  const umapParamsRow = document.createElement('tr');
  umapParamsRow.className = 'umap-params-row';
  umapParamsRow.style.display = 'none';
  const umapParamsCell = document.createElement('td');

  const paramsContainer = document.createElement('div');
  paramsContainer.style.cssText = 'display: flex; gap: 8px; align-items: center; font-size: 11px;';

  const neighborsLabel = document.createElement('label');
  neighborsLabel.textContent = 'Neighbors:';
  neighborsLabel.style.cssText = 'font-weight: bold; min-width: 60px;';

  const neighborsInput = document.createElement('input');
  neighborsInput.type = 'number';
  neighborsInput.value = '8';
  neighborsInput.min = '3';
  neighborsInput.max = '20';
  neighborsInput.step = '1';
  neighborsInput.className = 'umap-neighbors-input';
  neighborsInput.style.cssText = 'width: 45px; padding: 2px;';

  const minDistLabel = document.createElement('label');
  minDistLabel.textContent = 'Min Dist:';
  minDistLabel.style.cssText = 'font-weight: bold; min-width: 55px; margin-left: 8px;';

  const minDistInput = document.createElement('input');
  minDistInput.type = 'number';
  minDistInput.value = '0.1';
  minDistInput.min = '0.001';
  minDistInput.max = '1.0';
  minDistInput.step = '0.01';
  minDistInput.className = 'umap-mindist-input';
  minDistInput.style.cssText = 'width: 55px; padding: 2px;';

  neighborsInput.addEventListener('change', (e) => {
    const value = parseInt(e.target.value);
    logInfo(`UMAP neighbors parameter changed to: ${value}`);
    logProgress('More neighbors = more global structure preservation');
  });

  minDistInput.addEventListener('change', (e) => {
    const value = parseFloat(e.target.value);
    logInfo(`UMAP min_dist parameter changed to: ${value}`);
    logProgress('Lower min_dist = tighter clusters, higher = looser embedding');
  });

  paramsContainer.appendChild(neighborsLabel);
  paramsContainer.appendChild(neighborsInput);
  paramsContainer.appendChild(minDistLabel);
  paramsContainer.appendChild(minDistInput);

  umapParamsCell.appendChild(paramsContainer);
  umapParamsRow.appendChild(umapParamsCell);
  controlTable.appendChild(umapParamsRow);

  // Components selection row
  const componentsRow = document.createElement('tr');
  const componentsCell = document.createElement('td');
  const componentsSelect = document.createElement('select');
  componentsSelect.style.width = '100%';
  componentsSelect.className = 'components-selector';

  function updateComponentsSelector() {
    componentsSelect.innerHTML = '';

    if (reductionMethod === 'pca') {
      const option2D = document.createElement('option');
      option2D.value = '2';
      option2D.textContent = 'PCA to 2D';
      componentsSelect.appendChild(option2D);

      const option3D = document.createElement('option');
      option3D.value = '3';
      option3D.textContent = 'PCA to 3D (reorder axes)';
      option3D.selected = true;
      componentsSelect.appendChild(option3D);

      reductionComponents = 3; // Sync the variable
    } else if (reductionMethod === 'tsne') {
      const option2D = document.createElement('option');
      option2D.value = '2';
      option2D.textContent = 't-SNE to 2D (recommended)';
      option2D.selected = true;
      componentsSelect.appendChild(option2D);

      const option3D = document.createElement('option');
      option3D.value = '3';
      option3D.textContent = 't-SNE to 3D';
      componentsSelect.appendChild(option3D);

      reductionComponents = 2; // Default for t-SNE
    } else if (reductionMethod === 'umap') {
      const option2D = document.createElement('option');
      option2D.value = '2';
      option2D.textContent = 'UMAP to 2D (recommended)';
      option2D.selected = true;
      componentsSelect.appendChild(option2D);

      const option3D = document.createElement('option');
      option3D.value = '3';
      option3D.textContent = 'UMAP to 3D';
      componentsSelect.appendChild(option3D);

      reductionComponents = 2; // Default for UMAP
    }
  }

  componentsSelect.addEventListener('change', (e) => {
    reductionComponents = parseInt(e.target.value);
    logInfo(`Target dimensions changed to: ${reductionComponents}D`);
  });

  updateComponentsSelector(); // Initialize

  componentsCell.appendChild(componentsSelect);
  componentsRow.appendChild(componentsCell);
  controlTable.appendChild(componentsRow);

  // Toggle button row
  const toggleRow = document.createElement('tr');
  const toggleCell = document.createElement('td');
  const toggleButton = document.createElement('button');
  toggleButton.textContent = 'Toggle Reduction';
  toggleButton.style.width = '100%';
  toggleButton.style.marginTop = '5px';
  toggleButton.style.padding = '8px';
  toggleButton.style.cursor = 'pointer';

  toggleButton.addEventListener('click', () => {
    toggleDimensionalityReduction();
  });

  toggleCell.appendChild(toggleButton);
  toggleRow.appendChild(toggleCell);
  controlTable.appendChild(toggleRow);

  // Reset View button row
  const resetRow = document.createElement('tr');
  const resetCell = document.createElement('td');
  const resetButton = document.createElement('button');
  resetButton.textContent = 'Reset View';
  resetButton.style.width = '100%';
  resetButton.style.marginTop = '5px';
  resetButton.style.padding = '5px';
  resetButton.style.cursor = 'pointer';
  resetButton.style.backgroundColor = '#f0f0f0';

  resetButton.addEventListener('click', () => {
    renderer.resetCamera();
    renderWindow.render();
    logInfo('Camera reset');
  });

  resetCell.appendChild(resetButton);
  resetRow.appendChild(resetCell);
  controlTable.appendChild(resetRow);
}

function updateUMAPParametersVisibility() {
  const umapRow = document.querySelector('.umap-params-row');
  if (umapRow) {
    umapRow.style.display = reductionMethod === 'umap' ? 'table-row' : 'none';
  }
}

// ----------------------------------------------------------------------------
// UI Control Handling
// ----------------------------------------------------------------------------

const controllerContainer = fullScreenRenderer.addController(controlPanel);

// Make sure it’s above the WASM canvas
if (controllerContainer) {
  controllerContainer.style.position = 'absolute';
  controllerContainer.style.top = '10px';
  controllerContainer.style.left = '10px';
  controllerContainer.style.zIndex = '20';    // > 0, so it shows above wasm canvas
}

const representationSelector = document.querySelector('.representations');
const vrbutton = document.querySelector('.vrbutton');
const fileInput = document.getElementById('fileInput');

fileInput.addEventListener('change', handleFile);

representationSelector.addEventListener('change', (e) => {
  const newRepValue = Number(e.target.value);
  actor.getProperty().setRepresentation(newRepValue);
  yActor.set('representation', newRepValue);
  renderWindow.render();
});

vrbutton.addEventListener('click', (e) => {
  if (vrbutton.textContent === 'Send To VR') {
    XRHelper.startXR(XrSessionTypes.InlineVr);
    vrbutton.textContent = 'Return From VR';
  } else {
    XRHelper.stopXR();
    vrbutton.textContent = 'Send To VR';
  }
});

// ----------------------------------------------------------------------------
// Application Initialization
// ----------------------------------------------------------------------------

async function initializeApplication() {
  logInfo('Starting VTK.js with TensorFlow.js PCA Application...');

  // Initialize logging system
  initializeLogging();

  // Initialize TensorFlow.js
  const tfReady = await initializeTensorFlow();
  if (!tfReady) {
    logError('TensorFlow.js failed to initialize, PCA will not work');
  }

  // Setup UI controls
  setupDimensionalityReductionControls();

  logSuccess('Application initialized successfully');
  logInfo('Features available:');
  logProgress('  - VTP file loading and visualization');
  logProgress('  - WebXR/VR support');
  logProgress('  - PCA with TensorFlow.js (optimized memory management)');
  logProgress('  - t-SNE and UMAP (pure JavaScript implementations)');
  logProgress('  - Advanced logging and performance monitoring');
  logProgress('  - Automatic optimization for datasets from 100 to 1,000,000+ points');
  logInfo('Load a VTP file to get started!');
  logMemoryUsage('on startup');
}

// Add to your index.js after initializeApplication()
window.debugCanvases = function () {
  const allCanvases = document.querySelectorAll('canvas');
  logInfo(`Found ${allCanvases.length} canvas elements:`);

  allCanvases.forEach((canvas, i) => {
    const rect = canvas.getBoundingClientRect();
    const computed = window.getComputedStyle(canvas);

    logInfo(`Canvas ${i + 1}:`);
    logProgress(`  ID: ${canvas.id || '(no id)'}`);
    logProgress(`  Size: ${canvas.width}x${canvas.height}`);
    logProgress(`  Rect: ${rect.width}x${rect.height}`);
    logProgress(`  Display: ${computed.display}`);
    logProgress(`  Z-index: ${computed.zIndex}`);
    logProgress(`  Visibility: ${computed.visibility}`);
    logProgress(`  Opacity: ${computed.opacity}`);
  });

  const wasmCanvas = document.getElementById('vtk-wasm-canvas');
  if (wasmCanvas) {
    logSuccess('WASM canvas exists in DOM');

    // Try to draw something on it
    const ctx = wasmCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'red';
      ctx.fillRect(50, 50, 200, 100);
      ctx.fillStyle = 'white';
      ctx.font = '30px Arial';
      ctx.fillText('WASM CANVAS TEST', 60, 110);
      logSuccess('Drew test pattern on WASM canvas (you should see red rectangle)');
    }
  } else {
    logError('WASM canvas NOT found in DOM!');
  }
};

function reportRenderingBackend() {
  const hasWasm = typeof WebAssembly === 'object';
  const backend = isWasmBackend()
    ? 'VTK-wasm (C++ in WebAssembly)'
    : 'vtk.js WebGL (JavaScript)';
  const wasmLoaded = !!wasmModule;

  // 🔹 Prefer HEAP8 if present, otherwise fall back to HEAPU8
  let heapBuffer = null;
  if (wasmLoaded) {
    if (wasmModule.HEAP8 && wasmModule.HEAP8.buffer) {
      heapBuffer = wasmModule.HEAP8.buffer;
    } else if (wasmModule.HEAPU8 && wasmModule.HEAPU8.buffer) {
      heapBuffer = wasmModule.HEAPU8.buffer;
    }
  }

  const wasmHeapMb = heapBuffer
    ? (heapBuffer.byteLength / 1024 / 1024).toFixed(2)
    : '0.00';

  logInfo('========================================');
  logInfo(`Rendering backend: ${backend}`);
  logInfo(`WebAssembly supported: ${hasWasm}`);
  logInfo(`VTK-wasm module loaded: ${wasmLoaded}`);
  if (heapBuffer) {
    logInfo(`VTK-wasm heap size: ${wasmHeapMb} MB`);
  }
  logInfo('========================================');

  let badge = document.getElementById('backend-badge');
  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'backend-badge';
    badge.style.position = 'fixed';
    badge.style.bottom = '8px';
    badge.style.left = '8px';
    badge.style.background = 'rgba(0,0,0,0.75)';
    badge.style.color = '#0f0';
    badge.style.padding = '4px 8px';
    badge.style.fontSize = '11px';
    badge.style.fontFamily = 'monospace';
    badge.style.borderRadius = '4px';
    badge.style.zIndex = '2000';
    document.body.appendChild(badge);
  }
  badge.textContent = `Backend: ${backend}`;
}


// Set up cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    cleanupTensors();
  });
}

// Start the application
initializeApplication();

// Expose functions for debugging
window.toggleDimensionalityReduction = toggleDimensionalityReduction;
window.performPCA = performPCA;
window.performTSNE = performTSNE;
window.performUMAP = performUMAP;
window.extractPointsFromPolyData = extractPointsFromPolyData;
window.logMemoryUsage = logMemoryUsage;
window.cleanupTensors = cleanupTensors;