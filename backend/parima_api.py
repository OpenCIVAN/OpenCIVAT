"""
PARIMA Backend API Server
Provides HTTP endpoint for PARIMA model inference and automatic training
"""

import os
import pickle
import numpy as np
import json
import threading
import time
import platform
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend requests

# Global model variable
parima_model = None
model_path = None
training_config = None
training_thread = None
training_lock = threading.Lock()
last_training_time = None
training_in_progress = False

# Sequence history for LSTM (maintains last N feature vectors)
lstm_feature_history = []
lstm_history_size = 10  # Match sequence_length in training

def load_model(model_path):
    """
    Load PARIMA model from pickle file
    Supports both scikit-learn models and LSTM models
    
    Args:
        model_path: Path to .pkl model file
        
    Returns:
        Loaded model object or None if failed
    """
    global parima_model, lstm_feature_history
    
    try:
        if not os.path.exists(model_path):
            logger.error(f"Model file not found: {model_path}")
            return None
            
        logger.info(f"Loading PARIMA model from {model_path}...")
        with open(model_path, 'rb') as f:
            loaded = pickle.load(f)
            
        # Check if it's LSTM (has dict structure with 'model' key)
        if isinstance(loaded, dict) and 'model' in loaded and loaded.get('model_type') == 'lstm':
            parima_model = loaded
            lstm_feature_history = []  # Reset history on model load
            logger.info("LSTM model loaded (with scaler and sequence metadata)")
        else:
            # Traditional scikit-learn model
            parima_model = loaded
            logger.info("Scikit-learn model loaded")
            
        return parima_model
    except Exception as e:
        logger.error(f"Failed to load model: {str(e)}", exc_info=True)
        return None

def log_training_event(event_type, message, details=None):
    """
    Log training events to training history file
    
    Args:
        event_type: Type of event (e.g., 'TRAINING_STARTED', 'TRAINING_COMPLETED', 'MODEL_UPDATED')
        message: Human-readable message
        details: Optional dictionary with additional details
    """
    global training_config
    
    if not training_config or 'trainingLogFile' not in training_config:
        return
    
    log_file = training_config.get('trainingLogFile', './data/training_logs/training_history.log')
    os.makedirs(os.path.dirname(log_file), exist_ok=True)
    
    log_entry = {
        'timestamp': datetime.now().isoformat(),
        'event_type': event_type,
        'message': message,
        'details': details or {}
    }
    
    try:
        with open(log_file, 'a') as f:
            f.write(json.dumps(log_entry) + '\n')
        logger.info(f"[TRAINING LOG] {event_type}: {message}")
    except Exception as e:
        logger.error(f"Failed to write training log: {str(e)}")

def perform_training(csv_path=None, model_type=None, force=False):
    """
    Perform model training
    
    Args:
        csv_path: Path to CSV training data (None = use config default)
        model_type: Model type (None = use config default)
        force: Force training even if conditions not met
        
    Returns:
        Dictionary with training results or None if failed
    """
    global training_config, training_in_progress, last_training_time, parima_model, model_path
    
    if training_in_progress:
        logger.warning("Training already in progress, skipping...")
        return None
    
    try:
        training_in_progress = True
        
        # Import training functions
        import sys
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        from train_model import load_training_data, train_model
        
        # Get paths from config
        if not csv_path:
            csv_path = training_config.get('logFile', './data/training_logs/parima_decisions_log.csv')
        
        if not model_type:
            model_type = training_config.get('modelType', 'random_forest')
        
        # Check if CSV file exists and has enough samples
        if not os.path.exists(csv_path):
            logger.warning(f"Training data file not found: {csv_path}")
            log_training_event('TRAINING_SKIPPED', f"Training data file not found: {csv_path}")
            return None
        
        # Count samples in CSV
        import pandas as pd
        try:
            df = pd.read_csv(csv_path)
            n_samples = len(df)
            min_samples = training_config.get('minSamplesForTraining', 100)
            
            if n_samples < min_samples and not force:
                logger.info(f"Not enough samples for training: {n_samples} < {min_samples}")
                log_training_event('TRAINING_SKIPPED', 
                                  f"Not enough samples: {n_samples} < {min_samples}",
                                  {'n_samples': n_samples, 'min_required': min_samples})
                return None
        except Exception as e:
            logger.error(f"Failed to read CSV file: {str(e)}")
            return None
        
        # Log training start
        log_training_event('TRAINING_STARTED', 
                          f"Starting model training with {n_samples} samples",
                          {'csv_path': csv_path, 'model_type': model_type, 'n_samples': n_samples})
        
        # Load training data
        X, y = load_training_data(csv_path)
        
        # Train model
        result = train_model(X, y, 
                            model_type=model_type, 
                            output_path=model_path,
                            verbose=False)
        
        # Reload model
        if load_model(model_path):
            last_training_time = datetime.now()
            
            # Log training completion
            log_training_event('TRAINING_COMPLETED',
                              f"Model training completed successfully",
                              {
                                  'accuracy': result['accuracy'],
                                  'n_samples': result['n_samples'],
                                  'n_test_samples': result['n_test_samples'],
                                  'model_path': result['model_path']
                              })
            
            logger.info(f"✅ Model updated! Accuracy: {result['accuracy']:.4f}, "
                       f"Samples: {result['n_samples']} train, {result['n_test_samples']} test")
            
            return result
        else:
            log_training_event('TRAINING_FAILED', "Failed to reload model after training")
            return None
            
    except Exception as e:
        logger.error(f"Training failed: {str(e)}", exc_info=True)
        log_training_event('TRAINING_FAILED', f"Training error: {str(e)}")
        return None
    finally:
        training_in_progress = False

def auto_training_worker():
    """
    Background worker thread for automatic training
    """
    global training_config, last_training_time
    
    if not training_config or not training_config.get('autoTrain', False):
        logger.info("Automatic training is disabled")
        return
    
    interval_hours = training_config.get('autoTrainIntervalHours', 24)
    interval_seconds = interval_hours * 3600
    
    logger.info(f"Automatic training worker started (interval: {interval_hours} hours)")
    
    while True:
        try:
            time.sleep(interval_seconds)
            
            # Check if enough time has passed
            if last_training_time:
                time_since_last = (datetime.now() - last_training_time).total_seconds()
                if time_since_last < interval_seconds:
                    continue
            
            logger.info("Automatic training triggered...")
            perform_training()
            
        except Exception as e:
            logger.error(f"Error in auto training worker: {str(e)}")
            time.sleep(60)  # Wait 1 minute before retrying

def validate_features(features):
    """
    Validate feature vector matches expected format
    
    Args:
        features: Dictionary containing feature values
        
    Returns:
        (is_valid, error_message, feature_array)
    """
    required_features = [
        'frustumCoverage',
        'occlusionRatio',
        'meanVisibleDistance',
        'deviceFPS',
        'deviceCPULoad'
    ]
    
    # Check for required features
    missing = [f for f in required_features if f not in features]
    if missing:
        return False, f"Missing required features: {missing}", None
    
    # Extract feature values in order
    feature_array = []
    try:
        for feature_name in required_features:
            value = float(features[feature_name])
            if not np.isfinite(value):
                return False, f"Invalid value for {feature_name}: {value}", None
            feature_array.append(value)
        
        # Add viewport trajectory features if available
        if 'viewportTrajectory' in features:
            trajectory = features['viewportTrajectory']
            if isinstance(trajectory, list) and len(trajectory) > 0:
                # Flatten trajectory (velocity, acceleration, etc.)
                for item in trajectory[-10:]:  # Take last 10 if available
                    if isinstance(item, dict):
                        feature_array.extend([
                            item.get('velocity', 0.0),
                            item.get('acceleration', 0.0),
                            item.get('angularVelocity', 0.0)
                        ])
        
        # Pad to expected length if needed (PARIMA models may expect fixed input size)
        # Adjust based on your actual model's expected input size
        expected_size = len(required_features) + 30  # 10 trajectory points * 3 features
        if len(feature_array) < expected_size:
            feature_array.extend([0.0] * (expected_size - len(feature_array)))
        elif len(feature_array) > expected_size:
            feature_array = feature_array[:expected_size]
            
        feature_array = np.array(feature_array).reshape(1, -1)
        return True, None, feature_array
        
    except (ValueError, TypeError) as e:
        return False, f"Invalid feature format: {str(e)}", None

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    global last_training_time, training_in_progress
    
    return jsonify({
        'status': 'healthy',
        'model_loaded': parima_model is not None,
        'model_path': model_path,
        'last_training_time': last_training_time.isoformat() if last_training_time else None,
        'training_in_progress': training_in_progress,
        'auto_training_enabled': training_config.get('autoTrain', False) if training_config else False
    })

@app.route('/api/parima/train', methods=['POST'])
def train_endpoint():
    """
    Manual training endpoint
    
    Optional JSON body:
    {
        "force": bool,  # Force training even if conditions not met
        "csv_path": str,  # Override CSV path
        "model_type": str  # Override model type
    }
    """
    global training_in_progress
    
    if training_in_progress:
        return jsonify({
            'success': False,
            'error': 'Training already in progress',
            'message': 'Please wait for current training to complete'
        }), 409
    
    try:
        data = request.get_json() or {}
        force = data.get('force', False)
        csv_path = data.get('csv_path', None)
        model_type = data.get('model_type', None)
        
        logger.info("Manual training triggered via API")
        
        # Run training in background thread to avoid blocking
        def train_async():
            result = perform_training(csv_path=csv_path, model_type=model_type, force=force)
            if result:
                logger.info("✅ Manual training completed successfully")
            else:
                logger.warning("Manual training failed or was skipped")
        
        thread = threading.Thread(target=train_async, daemon=True)
        thread.start()
        
        return jsonify({
            'success': True,
            'message': 'Training started in background',
            'status': 'training_in_progress'
        })
        
    except Exception as e:
        logger.error(f"Training endpoint error: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': f'Training failed: {str(e)}'
        }), 500

@app.route('/api/parima/training/status', methods=['GET'])
def training_status():
    """Get training status and history"""
    global last_training_time, training_in_progress, training_config
    
    # Read training log file if available
    training_history = []
    if training_config and 'trainingLogFile' in training_config:
        log_file = training_config.get('trainingLogFile')
        if os.path.exists(log_file):
            try:
                with open(log_file, 'r') as f:
                    for line in f:
                        if line.strip():
                            training_history.append(json.loads(line.strip()))
                # Get last 10 entries
                training_history = training_history[-10:]
            except Exception as e:
                logger.warning(f"Failed to read training log: {str(e)}")
    
    return jsonify({
        'training_in_progress': training_in_progress,
        'last_training_time': last_training_time.isoformat() if last_training_time else None,
        'auto_training_enabled': training_config.get('autoTrain', False) if training_config else False,
        'auto_training_interval_hours': training_config.get('autoTrainIntervalHours', 24) if training_config else None,
        'min_samples_required': training_config.get('minSamplesForTraining', 100) if training_config else None,
        'recent_training_history': training_history
    })

@app.route('/api/system/gpu', methods=['GET'])
def get_gpu_metrics():
    """Get system GPU metrics (macOS)"""
    try:
        from gpu_metrics import get_macos_gpu_usage, get_gpu_info
        
        gpu_usage = get_macos_gpu_usage()
        gpu_info = get_gpu_info()
        
        return jsonify({
            'success': True,
            'gpu_usage': gpu_usage,  # Percentage (0-100) or None
            'gpu_info': gpu_info,    # GPU name/model or None
            'available': gpu_usage is not None,
            'platform': platform.system()
        })
    except Exception as e:
        logger.error(f"GPU metrics error: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e),
            'gpu_usage': None,
            'available': False,
            'platform': platform.system()
        }), 500

@app.route('/api/parima/model/switch', methods=['POST'])
def switch_model_endpoint():
    """
    Switch the active model
    """
    try:
        data = request.get_json() or {}
        model_type = data.get('model_type')
        
        if not model_type:
            return jsonify({
                'success': False,
                'error': 'Missing model_type parameter'
            }), 400
            
        script_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(script_dir)
        
        if model_type == 'lstm':
            new_model_path = os.path.join(project_root, 'model_comparison', 'lstm_model.pkl')
        elif model_type == 'random_forest':
            new_model_path = os.path.join(project_root, 'model_comparison', 'random_forest_model.pkl')
        else:
             return jsonify({
                'success': False,
                'error': f'Unknown model type: {model_type}'
            }), 400
            
        if load_model(new_model_path):
            global model_path
            model_path = new_model_path
            return jsonify({
                'success': True,
                'message': f'Switched to {model_type} model',
                'model_path': model_path
            })
        else:
            return jsonify({
                'success': False,
                'error': f'Failed to load {model_type} model from {new_model_path}'
            }), 500
            
    except Exception as e:
        logger.error(f"Switch model error: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/parima/predict', methods=['POST'])
def predict():
    """
    PARIMA prediction endpoint
    
    Expected JSON body:
    {
        "frustumCoverage": float,
        "occlusionRatio": float,
        "meanVisibleDistance": float,
        "deviceFPS": float,
        "deviceCPULoad": float,
        "viewportTrajectory": [{"velocity": float, "acceleration": float, "angularVelocity": float}, ...]
    }
    
    Returns:
    {
        "success": bool,
        "decision": {
            "lod": int,
            "tiles": [str] (optional)
        },
        "error": str (if failed)
    }
    """
    global parima_model
    
    if parima_model is None:
        return jsonify({
            'success': False,
            'error': 'Model not loaded',
            'decision': {'lod': 1}  # Fallback to medium LOD
        }), 503
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'No JSON data provided',
                'decision': {'lod': 1}
            }), 400
        
        # Validate features
        is_valid, error_msg, feature_array = validate_features(data)
        if not is_valid:
            return jsonify({
                'success': False,
                'error': error_msg,
                'decision': {'lod': 1}
            }), 400
        
        # Perform prediction
        logger.info(f"Making prediction with features shape: {feature_array.shape}")
        
        # Check if LSTM model
        if isinstance(parima_model, dict) and parima_model.get('model_type') == 'lstm':
            # LSTM prediction requires sequence
            global lstm_feature_history
            lstm_model = parima_model['model']
            scaler = parima_model['scaler']
            sequence_length = parima_model['sequence_length']
            
            # Add current features to history
            lstm_feature_history.append(feature_array[0])
            
            # Keep only last N features
            if len(lstm_feature_history) > sequence_length:
                lstm_feature_history = lstm_feature_history[-sequence_length:]
            
            # Check if we have enough history
            if len(lstm_feature_history) < sequence_length:
                # Not enough history yet, use current features repeated
                sequence = np.tile(feature_array[0], (sequence_length, 1))
            else:
                # Use actual history
                sequence = np.array(lstm_feature_history)
            
            # Normalize sequence
            sequence_scaled = scaler.transform(sequence)
            sequence_scaled = sequence_scaled.reshape(1, sequence_length, -1)
            
            # Predict
            prediction_probs = lstm_model.predict(sequence_scaled, verbose=0)
            lod_index = int(np.argmax(prediction_probs[0]))
            
            logger.info(f"LSTM prediction: LOD {lod_index} (probabilities: {prediction_probs[0]})")
        else:
            # Traditional scikit-learn model (RandomForest, SVM, etc.)
            # Try to get prediction probabilities if available
            if hasattr(parima_model, 'predict_proba'):
                prediction_probs = parima_model.predict_proba(feature_array)[0]
                lod_index = int(np.argmax(prediction_probs))
                logger.info(f"Prediction probabilities: {dict(enumerate(prediction_probs))}")
                logger.info(f"Predicted LOD: {lod_index} (confidence: {prediction_probs[lod_index]:.3f})")
            else:
                prediction = parima_model.predict(feature_array)
                lod_index = int(prediction[0]) if hasattr(prediction, '__len__') else int(prediction)
                logger.info(f"Predicted LOD: {lod_index} (no probability scores available)")
        
        # Log key features for debugging
        if feature_array.shape[1] >= 5:
            logger.info(f"Key features - FPS: {feature_array[0][3]:.1f}, "
                       f"Distance: {feature_array[0][2]:.1f}, "
                       f"FrustumCoverage: {feature_array[0][0]:.3f}, "
                       f"CPU: {feature_array[0][4]:.3f}")
        
        # Clamp LOD to valid range
        lod_index = max(0, min(lod_index, 5))  # Now supports 6 LOD levels (0, 1, 2, 3, 4, 5)
        
        # If model also returns tile list, extract it
        # For now, return LOD only (tile selection can be done client-side)
        decision = {
            'lod': lod_index
        }
        
        logger.info(f"Final prediction result: LOD {lod_index}")
        
        return jsonify({
            'success': True,
            'decision': decision
        })
        
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': f'Prediction failed: {str(e)}',
            'decision': {'lod': 1}  # Fallback
        }), 500

def load_config():
    """
    Load configuration from config.json
    """
    global training_config
    
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    config_path = os.path.join(project_root, 'config.json')
    
    try:
        if os.path.exists(config_path):
            with open(config_path, 'r') as f:
                config = json.load(f)
                training_config = config.get('parima', {}).get('training', {})
                logger.info("Configuration loaded successfully")
                return config
        else:
            logger.warning(f"Config file not found: {config_path}")
            training_config = {}
            return None
    except Exception as e:
        logger.error(f"Failed to load config: {str(e)}")
        training_config = {}
        return None

def initialize_app(model_file_path=None):
    """
    Initialize the Flask app and load model
    
    Args:
        model_file_path: Optional path to model file
    """
    global model_path, training_thread, training_config
    
    # Load configuration
    config = load_config()
    if config and 'parima' in config:
        training_config = config['parima'].get('training', {})
    
    # Determine model path
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    
    if model_file_path:
        # Command-line argument takes precedence
        model_path = model_file_path
    elif config and 'parima' in config and 'modelPath' in config['parima']:
        # Use path from config.json (relative to project root)
        config_model_path = config['parima']['modelPath']
        # Handle relative paths (./ or ../)
        if config_model_path.startswith('./'):
            model_path = os.path.join(project_root, config_model_path[2:])
        elif config_model_path.startswith('../'):
            # Relative to project root, go up one level
            model_path = os.path.join(os.path.dirname(project_root), config_model_path[3:])
        elif os.path.isabs(config_model_path):
            # Absolute path
            model_path = config_model_path
        else:
            # Relative path without ./
            model_path = os.path.join(project_root, config_model_path)
        logger.info(f"Using model path from config.json: {model_path}")
    else:
        # Default path relative to project root
        model_path = os.path.join(project_root, 'ml_models', 'PARIMA', 'model_checkpoint.pkl')
        logger.info(f"Using default model path: {model_path}")
    
    # Load model
    if load_model(model_path):
        logger.info("PARIMA API ready")
    else:
        logger.warning("Model not loaded - API will return fallback decisions")
    
    # Start automatic training thread if enabled
    if training_config and training_config.get('autoTrain', False):
        training_thread = threading.Thread(target=auto_training_worker, daemon=True)
        training_thread.start()
        logger.info("Automatic training thread started")

if __name__ == '__main__':
    import sys
    
    # Check for command-line model path
    model_path_arg = sys.argv[1] if len(sys.argv) > 1 else None
    initialize_app(model_path_arg)
    
    # Start Flask server
    port = int(os.environ.get('PORT', 5001))
    logger.info(f"Starting PARIMA API server on port {port}")
    app.run(host='0.0.0.0', port=port, debug=False)

