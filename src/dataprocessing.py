import pandas as pd


def load_data(path):
    """Load the original Online Retail dataset."""
    return pd.read_excel(".../data/raw/Online Retail.xlsx")


def clean_data(df):
    """Clean the Online Retail dataset."""

    # Remove duplicate rows
    df = df.drop_duplicates()

    # Keep only valid purchases
    df = df[df["Quantity"] > 0]

    # Keep only positive prices
    df = df[df["UnitPrice"] > 0]

    # Remove customers without CustomerID
    df = df[df["CustomerID"].notnull()]

    # Create total transaction value
    df["TotalPrice"] = df["Quantity"] * df["UnitPrice"]

    return df


def save_cleaned_data(df, output_path):
    """Save cleaned dataset to CSV."""
    df.to_csv(output_path, index=False)


def process_data(input_path, output_path):
    """Load, clean and save the dataset."""

    df = load_data(input_path)
    df = clean_data(df)
    save_cleaned_data(df, output_path)

    return df