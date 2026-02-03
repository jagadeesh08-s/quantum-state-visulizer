"""
Dataset Manager - Multi-Dataset Support for Medical ML
Automatically discovers and manages multiple datasets in a base directory.
"""

import os
import glob
from typing import Dict, List, Optional
from pathlib import Path


class DatasetInfo:
    """Information about a discovered dataset"""
    def __init__(self, name: str, path: str, image_count: int, classes: List[str]):
        self.name = name
        self.path = path
        self.image_count = image_count
        self.classes = classes
        
    def to_dict(self):
        return {
            "name": self.name,
            "path": self.path,
            "imageCount": self.image_count,
            "classes": self.classes
        }


class DatasetManager:
    """
    Manages multiple medical imaging datasets.
    Auto-discovers datasets in a base directory and provides switching functionality.
    """
    
    def __init__(self, base_path: str = None):
        """
        Initialize dataset manager.
        
        Args:
            base_path: Base directory containing multiple datasets (e.g., "backend/probe_results/")
        """
        self.base_path = base_path or os.getenv("DATASET_BASE_PATH", "backend/probe_results/")
        self.datasets: Dict[str, DatasetInfo] = {}
        self.current_dataset: Optional[str] = None
        
        # Auto-discover datasets on initialization
        if os.path.exists(self.base_path):
            self.discover_datasets()
    
    def discover_datasets(self) -> Dict[str, DatasetInfo]:
        """
        Auto-discover all datasets in the base path.
        A valid dataset must have train/test/val structure or direct class folders.
        """
        print(f"Discovering datasets in: {self.base_path}")
        
        if not os.path.exists(self.base_path):
            print(f"Base path does not exist: {self.base_path}")
            return {}
        
        # Look for subdirectories that could be datasets
        for item in os.listdir(self.base_path):
            item_path = os.path.join(self.base_path, item)
            
            if not os.path.isdir(item_path):
                continue
            
            # Check if this directory contains a valid dataset structure
            dataset_info = self._analyze_dataset(item, item_path)
            
            if dataset_info:
                self.datasets[item] = dataset_info
                print(f"Found dataset: {item} ({dataset_info.image_count} images, {len(dataset_info.classes)} classes)")
        
        # Set default dataset (prefer 'dataset' folder, otherwise first one)
        if 'dataset' in self.datasets:
            self.current_dataset = 'dataset'
        elif self.datasets:
            self.current_dataset = list(self.datasets.keys())[0]
        
        print(f"Total datasets discovered: {len(self.datasets)}")
        if self.current_dataset:
            print(f"Default dataset: {self.current_dataset}")
        
        return self.datasets
    
    def _analyze_dataset(self, name: str, path: str) -> Optional[DatasetInfo]:
        """
        Analyze a directory to determine if it's a valid dataset.
        Returns DatasetInfo if valid, None otherwise.
        """
        # Check for standard splits (train/test/val) directly in path
        has_train = os.path.exists(os.path.join(path, 'train'))
        has_test = os.path.exists(os.path.join(path, 'test'))
        has_val = os.path.exists(os.path.join(path, 'val')) or os.path.exists(os.path.join(path, 'valid'))
        
        # Check for nested dataset folder (e.g., "CT Brain/dataset/train" or "DatasetName/ActualDataset/train")
        nested_dataset = os.path.join(path, 'dataset')
        if not (has_train or has_test or has_val):
            # Look for subdirectories that might contain the actual dataset
            for item in os.listdir(path):
                item_path = os.path.join(path, item)
                if os.path.isdir(item_path):
                    # Check if this subdirectory has train/test/val
                    if os.path.exists(os.path.join(item_path, 'train')):
                        has_train = True
                        path = item_path
                        break
                    elif os.path.exists(os.path.join(item_path, 'test')):
                        has_test = True
                        path = item_path
                        break
                    elif os.path.exists(os.path.join(item_path, 'val')) or os.path.exists(os.path.join(item_path, 'valid')):
                        has_val = True
                        path = item_path
                        break
        elif os.path.exists(nested_dataset):
            path = nested_dataset
            has_train = os.path.exists(os.path.join(path, 'train'))
            has_test = os.path.exists(os.path.join(path, 'test'))
            has_val = os.path.exists(os.path.join(path, 'val'))
        
        # Must have at least train folder or direct class folders
        if not has_train:
            # Check if root has class folders directly
            subdirs = [d for d in os.listdir(path) if os.path.isdir(os.path.join(path, d))]
            if not subdirs:
                return None
        
        # Count images and detect classes
        image_extensions = ['*.jpg', '*.jpeg', '*.png', '*.dcm']
        total_images = 0
        classes = set()
        
        # Search in train/test/val if they exist
        search_dirs = []
        if has_train:
            search_dirs.append(os.path.join(path, 'train'))
        if has_test:
            search_dirs.append(os.path.join(path, 'test'))
        if has_val:
            search_dirs.append(os.path.join(path, 'val'))
        
        # If no standard splits, search in root
        if not search_dirs:
            search_dirs = [path]
        
        for search_dir in search_dirs:
            # Find class folders
            if os.path.exists(search_dir):
                class_folders = [d for d in os.listdir(search_dir) 
                               if os.path.isdir(os.path.join(search_dir, d))]
                
                if class_folders:
                    # Standard structure: split/class/images
                    for class_folder in class_folders:
                        classes.add(class_folder)
                        class_path = os.path.join(search_dir, class_folder)
                        
                        # Count images in this class
                        for ext in image_extensions:
                            total_images += len(glob.glob(os.path.join(class_path, ext)))
                else:
                    # Check for images directly in split folder OR in images/ subfolder
                    classes.add(os.path.basename(search_dir))
                    
                    # Check for images directly in split folder
                    for ext in image_extensions:
                        total_images += len(glob.glob(os.path.join(search_dir, ext)))
                    
                    # Also check for images/ subfolder
                    images_folder = os.path.join(search_dir, 'images')
                    if os.path.exists(images_folder):
                        for ext in image_extensions:
                            total_images += len(glob.glob(os.path.join(images_folder, ext)))
        
        # Only consider it a dataset if it has images
        if total_images == 0:
            return None
        
        return DatasetInfo(
            name=name,
            path=path,
            image_count=total_images,
            classes=sorted(list(classes))
        )
    
    def get_dataset_path(self, dataset_name: Optional[str] = None) -> Optional[str]:
        """
        Get the full path for a dataset.
        
        Args:
            dataset_name: Name of the dataset, or None for current dataset
            
        Returns:
            Full path to the dataset, or None if not found
        """
        if dataset_name is None:
            dataset_name = self.current_dataset
        
        if dataset_name and dataset_name in self.datasets:
            return self.datasets[dataset_name].path
        
        return None
    
    def switch_dataset(self, dataset_name: str) -> bool:
        """
        Switch to a different dataset.
        
        Args:
            dataset_name: Name of the dataset to switch to
            
        Returns:
            True if successful, False if dataset not found
        """
        if dataset_name in self.datasets:
            self.current_dataset = dataset_name
            print(f"Switched to dataset: {dataset_name}")
            return True
        else:
            print(f"Dataset not found: {dataset_name}")
            return False
    
    def list_datasets(self) -> List[Dict]:
        """
        Get a list of all available datasets.
        
        Returns:
            List of dataset information dictionaries
        """
        return [
            {
                **info.to_dict(),
                "isCurrent": name == self.current_dataset
            }
            for name, info in self.datasets.items()
        ]
    
    def get_current_dataset_info(self) -> Optional[Dict]:
        """
        Get information about the currently active dataset.
        
        Returns:
            Dataset info dictionary or None
        """
        if self.current_dataset and self.current_dataset in self.datasets:
            info = self.datasets[self.current_dataset]
            return {
                **info.to_dict(),
                "isCurrent": True
            }
        return None


# Global instance
dataset_manager = DatasetManager()
