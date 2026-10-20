import joblib
import numpy as np
import pandas as pd

from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score


def prepare_rfm_for_clustering(rfm):
    """
    Prepare RFM data for customer segmentation.
    Applies log transformation and standardization.
    """

    rfm_ml = rfm.copy()

    rfm_ml["Frequency"] = np.log1p(rfm_ml["Frequency"])
    rfm_ml["Monetary"] = np.log1p(rfm_ml["Monetary"])

    features = ["Recency", "Frequency", "Monetary"]

    scaler = StandardScaler()

    rfm_scaled = scaler.fit_transform(rfm_ml[features])

    return rfm_scaled, scaler


def find_optimal_k(rfm_scaled, k_range=range(2, 11)):
    """
    Calculate inertia and silhouette scores for different K values.
    """

    inertia = []
    silhouette_scores = []

    for k in k_range:

        kmeans = KMeans(
            n_clusters=k,
            random_state=42,
            n_init=10
        )

        labels = kmeans.fit_predict(rfm_scaled)

        inertia.append(kmeans.inertia_)

        score = silhouette_score(
            rfm_scaled,
            labels
        )

        silhouette_scores.append(score)

    return inertia, silhouette_scores


def create_segments(rfm, rfm_scaled, n_clusters=3):
    """
    Apply K-Means clustering and assign customer segments.
    """

    kmeans = KMeans(
        n_clusters=n_clusters,
        random_state=42,
        n_init=10
    )

    clusters = kmeans.fit_predict(rfm_scaled)

    result = rfm.copy()

    result["Cluster"] = clusters

    cluster_names = {
        0: "Loyal Customers",
        1: "At Risk Customers",
        2: "Potential Customers"
    }

    result["Segment"] = result["Cluster"].map(cluster_names)

    return result, kmeans


def save_segmentation_model(scaler, kmeans, path):
    """
    Save the scaler and K-Means model.
    """

    model = {
        "scaler": scaler,
        "kmeans": kmeans
    }

    joblib.dump(model, path)