import pandas as pd

def load_cleaned_data(path):
    """Load the cleaned Online Retail dataset."""
    df = pd.read_csv(path)
    df["InvoiceDate"] = pd.to_datetime(df["InvoiceDate"])
    return df


def calculate_rfm(df):
    """Calculate Recency, Frequency and Monetary for each customer."""

    reference_date = df["InvoiceDate"].max() + pd.Timedelta(days=1)

    # Recency
    recency = df.groupby("CustomerID")["InvoiceDate"].max()
    recency = (reference_date - recency).dt.days
    recency.name = "Recency"

    # Frequency
    frequency = df.groupby("CustomerID")["InvoiceNo"].nunique()
    frequency.name = "Frequency"

    # Monetary
    monetary = df.groupby("CustomerID")["TotalPrice"].sum()
    monetary.name = "Monetary"

    # Combine RFM
    rfm = pd.concat(
        [recency, frequency, monetary],
        axis=1
    )

    return rfm


def save_rfm(rfm, output_path):
    """Save RFM data to CSV."""
    rfm.to_csv(output_path, index=True)