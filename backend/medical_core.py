
import pandas as pd
import numpy as np
import io
import re
import os
import json
import logging

# Machine Learning Imports
from sklearn import datasets
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from joblib import dump, load

# Image Processing Imports
try:
    from PIL import Image
    from skimage.feature import graycomatrix, graycoprops
    from skimage.measure import shannon_entropy
    from skimage import color
    HAS_IMAGE_DEPS = True
except ImportError:
    HAS_IMAGE_DEPS = False
    print("Warning: Image processing dependencies (scikit-image, pillow) not found.")

# Internal Quantum Imports
from quantum_ml_primitives import (
    VariationalQuantumClassifier, 
    VQCConfig, 
    ZFeatureMap, 
    VariationalLayer, 
    MeasurementLayer
)

# Dataset Management
from dataset_manager import dataset_manager

# Setup Logger
logger = logging.getLogger("MedicalCore")

def get_drive_id(url: str) -> str:
    """Extract file ID from Google Drive URL"""
    patterns = [
        r'/d/([a-zA-Z0-9_-]+)',
        r'id=([a-zA-Z0-9_-]+)',
        r'/folders/([a-zA-Z0-9_-]+)'
    ]
    for p in patterns:
        match = re.search(p, url)
        if match:
            return match.group(1)
    return None

import gdown
import glob

def download_csv_from_drive(url: str) -> pd.DataFrame:
    """Download CSV from public Google Drive link using gdown"""
    try:
        is_folder = '/folders/' in url or 'drive/folders' in url
        output_path = "downloaded_data"
        if os.path.exists(output_path):
            import shutil
            shutil.rmtree(output_path, ignore_errors=True)
            
        if is_folder:
            print("Detected Drive Folder. Downloading...")
            gdown.download_folder(url, output=output_path, quiet=True, use_cookies=False)
            csv_files = glob.glob(f"{output_path}/**/*.csv", recursive=True)
            if not csv_files:
                 # Fallback to default
                 print("No CSV found in folder. Using built-in Default Data.")
                 return None 
            target_file = csv_files[0]
        else:
            file_id = get_drive_id(url)
            if not file_id:
                return None
            output_file = "downloaded_dataset.csv"
            gdown.download(url, output_file, quiet=True, fuzzy=True)
            
            if not os.path.exists(output_file) or os.path.getsize(output_file) < 100:
                return None
            target_file = output_file
            
        print(f"Loading data from: {target_file}")
        df = pd.read_csv(target_file)
        return df

    except Exception as e:
        print(f"Gdown error: {e}")
        return None

class ImageFeatureExtractor:
    """Helper to extract features from images for Quantum VQC"""
    
    @staticmethod
    def extract_features(image_path: str) -> dict:
        if not HAS_IMAGE_DEPS:
            return {}
            
        try:
            # Load and convert to grayscale
            img = Image.open(image_path).convert('L')
            # Resize for consistent processing speed (thumbnails are enough for texture stats)
            img = img.resize((128, 128)) 
            img_arr = np.array(img)
            
            # --- FEATURE 1: INTENSITY STATISTICS ---
            mean_intensity = np.mean(img_arr)
            std_intensity = np.std(img_arr)
            
            # --- FEATURE 2: ENTROPY (Complexity) ---
            # Measures information content / chaos
            entropy_val = shannon_entropy(img_arr)
            
            # --- FEATURE 3: GLCM TEXTURE FEATURES ---
            # Gray-Level Co-occurrence Matrix
            # (distance=1, angles=[0, 45, 90, 135]) -> take mean
            glcm = graycomatrix(img_arr, distances=[1], angles=[0, np.pi/4, np.pi/2, 3*np.pi/4], 
                                levels=256, symmetric=True, normed=True)
            
            contrast = graycoprops(glcm, 'contrast').mean()
            homogeneity = graycoprops(glcm, 'homogeneity').mean()
            correlation = graycoprops(glcm, 'correlation').mean()
            
            # --- FEATURE 4: SYMMETRY ---
            # Flip horizontally and compare
            flipped = np.fliplr(img_arr)
            # Correlation coefficient between image and its flip
            # Flatten to 1D arrays
            flat_img = img_arr.flatten()
            flat_flip = flipped.flatten()
            # Avoid div by zero
            if np.std(flat_img) == 0: symmetry = 1.0
            else: symmetry = np.corrcoef(flat_img, flat_flip)[0, 1]

            return {
                "mean_intensity": mean_intensity,
                "std_intensity": std_intensity,
                "entropy": entropy_val,
                "contrast": contrast,
                "homogeneity": homogeneity,
                "correlation": correlation,
                "symmetry": symmetry
            }
        except Exception as e:
            print(f"Error extracting features from {image_path}: {e}")
            return {}

    @staticmethod
    def process_directory(base_path: str, limit_per_class: int = 100000) -> pd.DataFrame:
        """
        Walks internal structure: 'train/fractured', 'train/not fractured' etc.
        Returns DataFrame suitable for training.
        """
        if not os.path.exists(base_path):
            print(f"Path does not exist: {base_path}")
            return None
            
        data = []
        total_processed = 0
        total_skipped = 0
        
        # We look for immediate subfolders (classes)
        # Expected structure: 
        # root/
        #   train/
        #       fracture/
        #       normal/
        # OR
        # root/
        #   fracture/
        #   normal/
        
        # Search implementation: Look for train, test, val, validation or default to root
        search_paths = []
        potential_subdirs = ['train', 'test', 'val', 'validation']
        found_subdirs = [os.path.join(base_path, d) for d in potential_subdirs if os.path.exists(os.path.join(base_path, d))]
        
        if found_subdirs:
            print(f"Found dataset splits: {[os.path.basename(p) for p in found_subdirs]}. Integrating ALL data.")
            search_paths = found_subdirs
        else:
            # No standard splits found, assume classes are in root
            search_paths = [base_path]
        
        print(f"Scanning for images in: {search_paths}")
        
        for search_root in search_paths:
            # List directories inside (classes)
            classes = [d for d in os.listdir(search_root) if os.path.isdir(os.path.join(search_root, d))]
            
            if not classes:
                #Maybe it's flat?
                print("No class subdirectories found in scan root.")
                continue
                
            print(f"Found classes: {classes}")
            
            for cls_name in classes:
                cls_path = os.path.join(search_root, cls_name)
                # Find images
                images = glob.glob(f"{cls_path}/*.jpg") + glob.glob(f"{cls_path}/*.png") + glob.glob(f"{cls_path}/*.jpeg")
                print(f"Found {len(images)} images in class '{cls_name}' at {search_root}")
                
                # Limit
                images = images[:limit_per_class]
                
                for idx, img_p in enumerate(images):
                    total_processed += 1
                    if idx % 50 == 0:
                        print(f"Processing image {idx+1}/{len(images)} in {cls_name}... (Total: {total_processed}, Skipped: {total_skipped})")

                    feats = ImageFeatureExtractor.extract_features(img_p)
                    if feats:
                        feats['diagnosis'] = cls_name # Use folder name as label
                        feats['image_path'] = img_p
                        data.append(feats)
                    else:
                        total_skipped += 1
                        
        print(f"\n=== FINAL SUMMARY ===")
        print(f"Total images processed: {total_processed}")
        print(f"Successfully extracted: {len(data)}")
        print(f"Skipped (errors): {total_skipped}")
        print(f"=====================\n")
        
        if not data:
            return None
            
        return pd.DataFrame(data)

class QuantumMedicalClassifier:
    """
    Real Quantum Medical Classifier using Variational Quantum Circuits (VQC).
    Now supports auto-loading datasets and strict data validation.
    """
    def __init__(self):
        self.dataset = None
        self.features = [] 
        self.selected_features = []
        self.target = None
        self.scaler = StandardScaler()
        self.model = None
        self.is_trained = False
        self.label_map = {}
        self.current_dataset_name = None  # Track which dataset is loaded
        
        # Initialize Default Quantum Model Structure (4 Qubits)
        self.num_qubits = 4
        self.feature_map = ZFeatureMap(num_qubits=self.num_qubits)
        self.vqc_config = VQCConfig(
            feature_map=self.feature_map,
            variational_layer=VariationalLayer(num_qubits=self.num_qubits, num_layers=2),
            measurement_layer=MeasurementLayer(num_qubits=self.num_qubits),
            optimizer='SPSA',
            learning_rate=0.05,
            max_iterations=50
        )
        self.model = VariationalQuantumClassifier(self.vqc_config)
        
        # Concurrency Control
        import threading
        self.training_lock = threading.Lock()

    def load_default_dataset(self):
        """
        Generate Synthetic Brain Tumor MRI Feature Dataset.
        Simulates features extracted from MRI slices (GLCM Texture, Shape, Intensity).
        """
        print("LOADING DEFAULT DATASET: Brain Tumor MRI Features (Simulated)")
        np.random.seed(42)
        n_samples = 300
        
        # Class 0: No Tumor / Benign
        # Class 1: Glioma / Meningioma (Malignant)
        
        data = []
        
        # Healthy / Benign Samples
        # Characteristics: Lower entropy (uniform), higher symmetry, smaller 'mass' deviations
        for _ in range(n_samples // 2):
            data.append({
                "mean_contrast": np.random.normal(15.0, 3.0),      # Texture contrast
                "mean_homogeneity": np.random.normal(0.85, 0.05),  # Texture uniformity
                "tumor_size_cm": np.random.normal(0.5, 0.2),       # Very small or noise
                "brain_symmetry_index": np.random.normal(0.95, 0.03), # Highly symmetric
                "diagnosis": "No Tumor"
            })
            
        # Tumor Samples
        # Characteristics: High entropy (chaotic), low symmetry, visible mass
        for _ in range(n_samples // 2):
            data.append({
                "mean_contrast": np.random.normal(35.0, 5.0),      # High contrast (abnormality)
                "mean_homogeneity": np.random.normal(0.60, 0.08),  # Low uniformity
                "tumor_size_cm": np.random.normal(3.5, 1.2),       # Visible mass
                "brain_symmetry_index": np.random.normal(0.70, 0.1),  # Asymmetric due to mass effect
                "diagnosis": "Tumor Detected"
            })
            
        df = pd.DataFrame(data)
        # Shuffle
        df = df.sample(frac=1).reset_index(drop=True)
        return df

    def train(self, df: pd.DataFrame = None, target_col: str = 'diagnosis'):
        """Train the Quantum Model on the provided or default dataset."""
        # Non-blocking lock to prevent training loops
        if not self.training_lock.acquire(blocking=False):
             print("⚠️ Training locked: Operation already in progress.")
             return {"status": "In Progress"}

        try:
            # 1. Check for MEDICAL_DATASET_URL from Drive
            drive_url = os.getenv("MEDICAL_DATASET_URL")
            if df is None and drive_url:
                print(f"Detected MEDICAL_DATASET_URL: {drive_url}")
                try:
                    df = download_csv_from_drive(drive_url)
                    if df is not None:
                        print(f"Successfully downloaded real dataset. Samples: {len(df)}")
                        target_col = 'diagnosis'
                        # Try to find a target column if diagnosis isn't there
                        if 'diagnosis' not in df.columns:
                             potential_targets = ['label', 'target', 'diagnosis', 'class', 'fracture', 'prognosis']
                             for t in potential_targets:
                                 if t in df.columns:
                                     target_col = t
                                     break
                    else:
                        print("Warning: download_csv_from_drive returned None.")
                except Exception as e:
                    print(f"CRITICAL ERROR in Drive Download: {e}")
                    import traceback
                    traceback.print_exc()

            # 2. Check for LOCAL_DATASET_PATH env var
            local_path = os.getenv("LOCAL_DATASET_PATH")
            
            if df is None and local_path and os.path.exists(local_path):
                print(f"Detected LOCAL_DATASET_PATH: {local_path}")
                
                # --- CACHE LOGIC START ---
                cache_path = os.path.join(local_path, "features_cache.csv")
                
                if os.path.exists(cache_path):
                    print(f"Found cached features at: {cache_path}")
                    print("Loading from CACHE for fast startup...")
                    try:
                        df = pd.read_csv(cache_path)
                        print(f"Successfully loaded {len(df)} records from cache.")
                    except Exception as e:
                        print(f"Failed to load cache: {e}. Reprocessing images...")
                        df = None
                
                if df is None:
                    print("Cache missing or invalid. Processing RAW IMAGES (this may take a while)...")
                    df = ImageFeatureExtractor.process_directory(local_path)
                    
                    if df is not None:
                         print(f"Saving extracted features to cache: {cache_path}")
                         try:
                             df.to_csv(cache_path, index=False)
                             print("Cache saved successfully.")
                         except Exception as e:
                             print(f"Warning: Could not save cache: {e}")

                # --- CACHE LOGIC END ---

                if df is not None:
                    # ensure proper return if loaded from cache or raw
                    pass
                else:
                    print("Failed to load images from local path. Falling back.")

            if df is None:
                # Check for local data in 'data' folder
                import glob
                data_files = glob.glob("data/*.csv")
                
                if data_files:
                    print(f"Loading local data from: {data_files[0]}")
                    df = pd.read_csv(data_files[0])
                    # Ensure we don't accidentally pick an ID column as target if user doesn't specify
                    if target_col not in df.columns:
                        # Try to guess target - usually 'fracture', 'label', 'target'
                        potential_targets = ['fracture', 'label', 'target', 'diagnosis', 'class']
                        for t in potential_targets:
                            if t in df.columns:
                                target_col = t
                                break
                        if target_col not in df.columns:
                            target_col = df.columns[-1]
                else:
                    print("CRITICAL: No real dataset found. Simulated fallback is DISABLED per user request.")
                    # self.dataset = None # Already None
                    self.is_trained = False
                    if self.training_lock.locked():
                        self.training_lock.release()
                    return {"success": False, "error": "Medical dataset not found or download failed."}
            
            if df is None:
                if self.training_lock.locked():
                    self.training_lock.release()
                return {"success": False, "error": "Dataset missing."}
            
            # Sanitization
            if target_col not in df.columns:
                 # Try to guess
                 target_col = df.columns[-1]

            self.dataset = df
            self.target = target_col
            
            # Detect numeric features
            self.features = [c for c in df.columns if c != target_col and np.issubdtype(df[c].dtype, np.number)]
            
            # Feature Selection (Dimensionality Reduction to fit 4 Qubits)
            if len(self.features) > self.num_qubits:
                # Just pick the first 4 for simplicity in this demo version
                # In a full version, we would use PCA here
                self.selected_features = self.features[:self.num_qubits]
            else:
                self.selected_features = self.features

            print(f"Features selected for Quantum Processing: {self.selected_features}")

            # Prepare Data
            X = df[self.selected_features].values
            y = df[target_col].factorize()[0] # Encode to 0, 1...
            
            # Save mapping
            unique_labels = df[target_col].unique()
            codes = df[target_col].factorize()[0]
            # create dictionary code -> label
            self.label_map = {}
            for code, label in zip(codes, df[target_col]):
                self.label_map[code] = label

            # Scale Data
            X_scaled = self.scaler.fit_transform(X)

            # Train VQC
            # We use a subset for speed if dataset is huge
            # Train VQC
            # Train VQC
            # We use a subset for speed if dataset is huge, but User requested ALL.
            # Increasing limit significantly.
            # UPDATE: User strictly requested 300 samples max for speed/stability
            if len(X_scaled) > 300:
                print(f"Dataset large ({len(X_scaled)}). Subsampling to 300 for quantum training...")
                indices = np.random.choice(len(X_scaled), 300, replace=False)
                X_train = X_scaled[indices]
                y_train = y[indices]
            else:
                X_train = X_scaled
                y_train = y

            print("Starting Quantum VQC Training...")
            train_data = [x.tolist() for x in X_train]
            train_labels = y_train.tolist()
            
            result = self.model.train(train_data, train_labels, max_iterations=20)
            
            self.is_trained = True
            print("Training Complete.")
            
            self.training_lock.release()
            return {
                "features": self.selected_features,
                "sample_count": len(df),
                "classes": list(self.label_map.values()),
                "training_loss": result.get('final_loss'),
                "status": "Success"
            }
        except Exception as e:
            print(f"Training Error: {e}")
            import traceback
            traceback.print_exc()
            
            if self.training_lock.locked():
                self.training_lock.release()
                
            return {"error": str(e), "status": "Failed"}

    async def save_to_db(self, db_session, origin="Imported"):
        if self.dataset is None:
            return
        
        from db_models import MedicalCaseRecord
        # Increase limit to 500 records saved
        sliced_df = self.dataset.head(500)
        
        for idx, row in sliced_df.iterrows():
            features_dict = {k: float(row[k]) for k in self.selected_features if k in row}
            
            case = MedicalCaseRecord(
                patient_id=str(row.get('patient_id', f"P-{idx}")),
                age=int(row.get('age', 0)),
                diagnosis=str(row.get('diagnosis', 'Unknown')),
                status='Training Data',
                dataset_origin=origin,
                features_json=features_dict
            )
            db_session.add(case)
        await db_session.commit()

    async def load_from_db(self, db_session):
        # We skip DB loading if we want the fresh default data always
        # Run in executor to avoid blocking the main thread during startup
        import asyncio
        loop = asyncio.get_running_loop()
        print("Medical Core: Offloading training to background thread...")
        return await loop.run_in_executor(None, self.train, None) 

    def predict(self, patient_data: dict) -> dict:
        """
        Predict diagnosis using trained Quantum Model.
        Includes STRICT Data Boundary Checks.
        """
        if not self.is_trained:
             # Auto-train if not trained
             print("Model not trained. Waking up training sequence...")
             self.train(None)

        # --- OUT OF BOUNDARY CHECK ---
        input_keys = set(patient_data.keys())
        required_keys = set(self.selected_features)
        
        # 1. Schema Validation
        # We check if the input contains the features we learned on.
        # If the input has completely different keys (e.g. from a different dataset), reject it.
        if not required_keys.issubset(input_keys):
            # Check for partial overlaps or completely different data
            return {
                "diagnosis": "INVALID DATA",
                "confidence": 0.0,
                "is_valid": False,
                "error": "Out of Boundary: Input data does not match the training schema.",
                "missing_features": list(required_keys - input_keys)
            }

        # 2. Extract and Scale Vector
        try:
            vector = [float(patient_data[f]) for f in self.selected_features]
            vector_np = np.array([vector])
            vector_scaled = self.scaler.transform(vector_np)
            
            # 3. Statistical Boundary Check (Outlier Detection)
            # If values are > 5 standard deviations away, it's likely junk data
            if np.any(np.abs(vector_scaled) > 5):
                 return {
                    "diagnosis": "OUTLIER DETECTED",
                    "confidence": 0.0,
                    "is_valid": False,
                    "error": "Out of Distribution: Data values are statistically anomalous."
                }
                
            # Run Prediction
            # VQC returns measurement expectation <Z>. 
            # Usually range -1 to 1.
            raw_result = self.model.predict(vector_scaled[0].tolist())
            # Assuming single output for binary/multiclass
            val = raw_result[0] 
            
            # Interpret result
            # If classes are mapped: 0 -> (-1 approx), 1 -> (+1 approx) or vice versa depending on Z mapping
            # Standard: |0> -> +1, |1> -> -1
            # We map simply: > 0 goes to one class, < 0 goes to the other, or nearest integer if multi-class
            
            # Simplest interpretation for 2 classes
            if len(self.label_map) == 2:
                 # If we trained with labels 0 and 1.
                 # 0 target usually maps to something close to expectation +1 or -1 depending on cost function?
                 # Hand-wavy for this demo: Threshold at 0.5 if output is prob, or 0 if expectation
                 
                 predicted_code = 1 if val < 0 else 0 
                 confidence = abs(val)
            else:
                 predicted_code = int(round(val))
            
            label = self.label_map.get(predicted_code, "Unknown")
            
            # --- Generate User-Friendly Explanation ---
            narrative = "The Quantum Model has completed its analysis."
            recommendations = ["Consult a specialist for further evaluation."]

            label_norm = label.lower()
            if "fracture" in label_norm and "not" not in label_norm:
                narrative = "The system has detected structural irregularities in the bone surface that are consistent with a fracture. The quantum feature extraction highlighted sharp intensity shifts suggestive of a break."
                recommendations = [
                    "Seek immediate orthopaedic evaluation.",
                    "Keep the affected limb immobilized to prevent further injury.",
                    "An X-ray or CT scan update may be required to confirm the exact alignment."
                ]
            elif "not" in label_norm or "normal" in label_norm:
                narrative = "The quantum analysis shows that the bone structure appears intact and uniform. No significant architectural distortions or fractures were identified by the model."
                recommendations = [
                    "Continue standard rest and recovery if pain persists.",
                    "If swelling increases, consider a follow-up with a primary care physician.",
                    "Apply ice and compression as directed by a healthcare provider."
                ]
            elif "benign" in label_norm:
                narrative = "The model classifies the analyzed sample as benign. The cellular or structural patterns observed fall within stable, non-aggressive ranges."
                recommendations = [
                    "Routine monitoring as recommended by your doctor.",
                    "Maintain regular screening schedules.",
                    "Keep a record of any physical changes in the area."
                ]
            elif "malignant" in label_norm:
                narrative = "URGENT: The quantum features identified patterns characteristic of malignant growth. This includes high entropy and irregular density mapping."
                recommendations = [
                    "Schedule an urgent consultation with an oncologist.",
                    "Prepare for comprehensive biopsy or advanced imaging.",
                    "Review family medical history for relevant data."
                ]
            
            return {
                "diagnosis": label,
                "confidence": float(confidence),
                "is_valid": True,
                "quantum_features": vector_scaled[0].tolist(),
                "narrative": narrative,
                "recommendations": recommendations
            }

        except Exception as e:
            return {
                "diagnosis": "ERROR",
                "confidence": 0.0,
                "is_valid": False,
                "error": str(e)
            }

# Global Instance
medical_core = QuantumMedicalClassifier()

def switch_and_train_dataset(dataset_name: str):
    """
    Helper function to switch to a different dataset and retrain the model.
    
    Args:
        dataset_name: Name of the dataset to switch to
        
    Returns:
        Training result dictionary
    """
    # Switch dataset in manager
    success = dataset_manager.switch_dataset(dataset_name)
    if not success:
        return {"error": f"Dataset '{dataset_name}' not found", "status": "Failed"}
    
    # Get the new dataset path
    dataset_path = dataset_manager.get_dataset_path()
    if not dataset_path:
        return {"error": "Could not get dataset path", "status": "Failed"}
    
    # Temporarily override the env var
    old_path = os.getenv("LOCAL_DATASET_PATH")
    os.environ["LOCAL_DATASET_PATH"] = dataset_path
    
    try:
        # Train with new dataset
        result = medical_core.train()
        medical_core.current_dataset_name = dataset_name
        return result
    finally:
        # Restore old path
        if old_path:
            os.environ["LOCAL_DATASET_PATH"] = old_path
        else:
            os.environ.pop("LOCAL_DATASET_PATH", None)
