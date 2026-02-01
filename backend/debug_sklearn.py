
try:
    print("Testing sklearn load...")
    from sklearn import datasets
    import pandas as pd
    data = datasets.load_breast_cancer()
    print("Dataset loaded.")
    df = pd.DataFrame(data.data, columns=data.feature_names)
    print(f"DataFrame created: {df.shape}")
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
