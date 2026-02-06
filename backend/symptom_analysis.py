
import pandas as pd
import numpy as np
import os
import joblib
import logging
import re
from typing import List, Dict, Union
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import MultiLabelBinarizer
from sklearn.metrics import accuracy_score, classification_report
import gdown

# Setup logging
logger = logging.getLogger("SymptomAnalysis")
logger.setLevel(logging.INFO)

class SymptomAnalyzer:
    """
    Analyzes patient symptoms to predict potential health conditions.
    Specialized for COVID-19 dataset but extensible.
    """
    
    def __init__(self):
        self.model = None
        self.mlb = None # MultiLabelBinarizer for symptoms
        self.symptom_columns = []
        self.disease_mapping = {}
        self.is_trained = False
        self.dataset_url = os.getenv("SYMPTOM_DATASET_URL", "https://drive.google.com/file/d/1_R8DpWlMLdxOk7sgDl6iMTSo6sPQIWel/view?usp=drive_link")
        self.local_data_path = "covid_symptoms.csv"
        self.model_path = "symptom_model.joblib"
        
    def get_drive_id(self, url: str) -> str:
        """Extract file ID from Google Drive URL"""
        patterns = [
            r'/d/([a-zA-Z0-9_-]+)',
            r'id=([a-zA-Z0-9_-]+)'
        ]
        for p in patterns:
            match = re.search(p, url)
            if match:
                return match.group(1)
        return None

    def download_dataset(self) -> bool:
        """Downloads the dataset from Google Drive."""
        try:
            file_id = self.get_drive_id(self.dataset_url)
            if not file_id:
                logger.error("Invalid Drive URL")
                return False
                
            logger.info(f"Downloading dataset from Drive ID: {file_id}...")
            gdown.download(self.dataset_url, self.local_data_path, quiet=True, fuzzy=True)
            
            if os.path.exists(self.local_data_path):
                logger.info("Dataset downloaded successfully.")
                return True
            return False
        except Exception as e:
            logger.error(f"Download failed: {e}")
            return False

    def load_and_preprocess(self):
        """Loads data, cleans it, and prepares for training."""
        if not os.path.exists(self.local_data_path):
            if not self.download_dataset():
                raise FileNotFoundError("Could not find or download dataset.")
        
        df = pd.read_csv(self.local_data_path)
        logger.info(f"Loaded {len(df)} records.")
        
        # --- Preprocessing Step ---
        # The user dataset likely has columns like 'Symptom_1', 'Symptom_2', ... 'Disease'
        # We need to flatten symptoms and encoding them.
        
        # 1. Clean column names (strip whitespace)
        df.columns = df.columns.str.strip()
        
        # 2. Identify Target and Symptom columns
        # Heuristic: 'Disease', 'Prognosis', 'Diagnosis' is target. Rest are symptoms.
        target_col = None
        possible_targets = ['Disease', 'Prognosis', 'Diagnosis', 'TYPE'] # 'TYPE' is common in some COVID datasets
        for t in possible_targets:
            match = [c for c in df.columns if c.lower() == t.lower()]
            if match:
                target_col = match[0]
                break
        
        if not target_col:
             # Fallback: Last column
             target_col = df.columns[-1]
             logger.warning(f"Target column not found, using last column: {target_col}")

        # 3. Handle features
        # Assuming features are categorical text or binary.
        # If binary (0/1), just use them.
        feature_cols = [c for c in df.columns if c != target_col]
        
        # Check if features are text-based (need encoding) or numeric
        if df[feature_cols].select_dtypes(include=['object']).shape[1] > 0:
             # Convert categorical text symptoms to One-Hot
             # Actually, creating a vocabulary of all unique symptoms across all columns
             # This handles the "Symptom_1, Symptom_2" format where order doesn't matter
             
             # Collect all unique symptoms
             symptoms_list = []
             for _, row in df[feature_cols].iterrows():
                 row_symptoms = [str(s).strip() for s in row.values if pd.notna(s) and str(s).strip().lower() != 'nan']
                 symptoms_list.append(row_symptoms)
                 
             self.mlb = MultiLabelBinarizer()
             X = self.mlb.fit_transform(symptoms_list)
             self.symptom_columns = list(self.mlb.classes_)
             
             # Save mappings
             logger.info(f"Extracted {len(self.symptom_columns)} unique symptoms.")
             
        else:
             # Assume already numeric/binary
             X = df[feature_cols].values
             self.symptom_columns = feature_cols
             
        y = df[target_col].values
        
        return X, y

    def train(self):
        """Trains the Random Forest model."""
        logger.info("Starting training...")
        try:
            X, y = self.load_and_preprocess()
            
            # Split
            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
            
            # Model: Random Forest
            self.model = RandomForestClassifier(n_estimators=100, random_state=42)
            self.model.fit(X_train, y_train)
            
            # Evaluate
            predictions = self.model.predict(X_test)
            acc = accuracy_score(y_test, predictions)
            logger.info(f"Model Accuracy: {acc * 100:.2f}%")
            
            self.is_trained = True
            
            # Persist
            joblib.dump({
                'model': self.model,
                'mlb': self.mlb,
                'symptom_columns': self.symptom_columns
            }, self.model_path)
            
            return {
                "success": True,
                "accuracy": acc,
                "symptoms_count": len(self.symptom_columns)
            }
            
        except Exception as e:
            logger.error(f"Training error: {e}")
            import traceback
            traceback.print_exc()
            return {"success": False, "error": str(e)}

    def load_model(self):
        """Loads trained model from disk."""
        if os.path.exists(self.model_path):
            try:
                data = joblib.load(self.model_path)
                self.model = data['model']
                self.mlb = data.get('mlb')
                self.symptom_columns = data['symptom_columns']
                self.is_trained = True
                return True
            except Exception:
                return False
        return False

    def predict(self, user_symptoms: List[str]):
        """
        Predicts condition based on list of symptoms.
        Returns detailed result formatted for UI.
        """
        if not self.is_trained:
            if not self.load_model():
                return {"error": "Model not trained yet."}
                
        # 1. Match user symptoms to trained features
        matched_symptoms = []
        
        # Prepare input vector
        if self.mlb:
             # Text matching
             # Fuzzy or direct match
             normalized_user = [s.lower().strip() for s in user_symptoms]
             normalized_vocab = {s.lower(): s for s in self.symptom_columns}
             
             clean_input = []
             for s in normalized_user:
                 if s in normalized_vocab:
                     clean_input.append(normalized_vocab[s])
                     matched_symptoms.append(s)
                 else:
                     # Check partial match (basic)
                     for v in normalized_vocab:
                         if s in v or v in s:
                             clean_input.append(normalized_vocab[v])
                             matched_symptoms.append(v) # mapped name
                             break
                             
             input_vector = self.mlb.transform([clean_input])
             
        else:
             # Numeric columns matching
             input_vector = np.zeros((1, len(self.symptom_columns)))
             for s in user_symptoms:
                 if s in self.symptom_columns:
                     idx = self.symptom_columns.index(s)
                     input_vector[0, idx] = 1
                     matched_symptoms.append(s)

        # 2. Check Match Threshold (3 symptoms)
        unique_matches = list(set(matched_symptoms))
        
        if len(unique_matches) < 3:
            return {
                "status": "INSUFFICIENT_DATA",
                "message": "Insufficient data for reliable prediction",
                "matched_symptoms": unique_matches,
                "suggestion": "Please enter more symptoms or consult a healthcare provider."
            }
            
        # 3. Predict
        prediction_prob = self.model.predict_proba(input_vector)[0]
        prediction_class = self.model.predict(input_vector)[0]
        
        # Get confidence
        classes = self.model.classes_
        confidence = max(prediction_prob) * 100
        
        # Disclaimer
        disclaimer = "⚠️ This is a preliminary analysis only. Please consult a qualified healthcare professional for accurate diagnosis and treatment."
        
        return {
            "status": "MATCH_DETECTED",
            "condition": prediction_class,
            "confidence": f"{confidence:.1f}%",
            "matched_symptoms": unique_matches,
            "disclaimer": disclaimer,
            "narrative": f"Based on the analysis of {len(unique_matches)} matching symptoms, the system indicates a probability of {confidence:.1f}% for {prediction_class}."
        }

    def get_symptoms(self) -> List[str]:
        """Returns list of all trained symptoms"""
        if not self.is_trained:
             self.load_model()
        return self.symptom_columns

# Global Instance
symptom_analyzer = SymptomAnalyzer()
