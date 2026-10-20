from datetime import datetime, timezone
from functools import lru_cache
import json
from pathlib import Path
from typing import Optional
from uuid import uuid4

import joblib
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field


BASE_DIR = Path(__file__).resolve().parents[1]
SEGMENTS_PATH = BASE_DIR / "data" / "outputs" / "customer_segments.csv"
RECOMMENDATIONS_PATH = BASE_DIR / "data" / "outputs" / "recommendations.csv"
TRANSACTIONS_PATH = BASE_DIR / "data" / "processed" / "onlineRetail_cleaned.csv"
LIVE_ORDERS_PATH = BASE_DIR / "data" / "outputs" / "live_orders.json"
USERS_PATH = BASE_DIR / "data" / "outputs" / "users.json"
MODEL_PATH = BASE_DIR / "models" / "customer_segmentation.pkl"
FRONTEND_PATH = BASE_DIR / "frontend"

SEGMENT_NAMES = {
    0: "Loyal Customers",
    1: "At Risk Customers",
    2: "Potential Customers",
}

DEMO_USERS = {
    "admin@giftshop.com": {
        "password": "admin123",
        "role": "admin",
        "name": "Admin User",
    },
    "user@giftshop.com": {
        "password": "user123",
        "role": "user",
        "name": "GiftShop Customer",
    },
}

ORDERS = []

CURATED_PRODUCT_IMAGES = {
    "lantern": [
        "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=95",
        "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1200&q=95",
        "https://images.unsplash.com/photo-1543198181-e619b495113c?auto=format&fit=crop&w=1200&q=95",
    ],
    "candle": [
        "https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=1200&q=95",
        "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=1200&q=95",
        "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=95",
        "https://images.unsplash.com/photo-1570824104453-508955ab713e?auto=format&fit=crop&w=1200&q=95",
    ],
    "t-light": [
        "https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=1200&q=95",
        "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=1200&q=95",
    ],
    "clock": [
        "https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?auto=format&fit=crop&w=1200&q=95",
        "https://images.unsplash.com/photo-1508057198894-247b23fe5ade?auto=format&fit=crop&w=1200&q=95",
    ],
    "heart": [
        "https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&w=1200&q=95",
        "https://images.unsplash.com/photo-1534349762230-e0cadf78f5da?auto=format&fit=crop&w=1200&q=95",
    ],
    "bottle": [
        "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=1200&q=95",
        "https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&w=1200&q=95",
    ],
    "jar": [
        "https://images.unsplash.com/photo-1563822249510-096eedc8f615?auto=format&fit=crop&w=1200&q=95",
        "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=1200&q=95",
    ],
    "doll": [
        "https://images.unsplash.com/photo-1558060370-d644479cb6f7?auto=format&fit=crop&w=1200&q=95",
        "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?auto=format&fit=crop&w=1200&q=95",
    ],
    "bird": [
        "https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&w=1200&q=95",
    ],
    "mug": [
        "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1200&q=95",
        "https://images.unsplash.com/photo-1577937927133-66ef06acdf18?auto=format&fit=crop&w=1200&q=95",
    ],
    "tea": [
        "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=1200&q=95",
        "https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=1200&q=95",
    ],
    "bag": [
        "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1200&q=95",
        "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=1200&q=95",
        "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=1200&q=95",
        "https://images.unsplash.com/photo-1591561954557-26941169b49e?auto=format&fit=crop&w=1200&q=95",
    ],
    "cake": [
        "https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=1200&q=95",
        "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=1200&q=95",
    ],
    "frame": [
        "https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&w=1200&q=95",
        "https://images.unsplash.com/photo-1534349762230-e0cadf78f5da?auto=format&fit=crop&w=1200&q=95",
    ],
    "box": [
        "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=1200&q=95",
        "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=1200&q=95",
    ],
    "paper": [
        "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=1200&q=95",
        "https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=1200&q=95",
    ],
    "toy": [
        "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?auto=format&fit=crop&w=1200&q=95",
        "https://images.unsplash.com/photo-1558060370-d644479cb6f7?auto=format&fit=crop&w=1200&q=95",
    ],
    "jewelry": [
        "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=1200&q=95",
        "https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=1200&q=95",
        "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=1200&q=95",
    ],
    "hanger": [
        "https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&w=1200&q=95",
    ],
    "doormat": [
        "https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&w=1200&q=95",
    ],
    "decor": [
        "https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&w=1200&q=95",
        "https://images.unsplash.com/photo-1534349762230-e0cadf78f5da?auto=format&fit=crop&w=1200&q=95",
        "https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=1200&q=95",
    ]
}


def _product_image_url(description, category="Accessories", stock_code=""):
    desc = "" if pd.isna(description) else str(description).lower()
    code_str = str(stock_code).strip()
    
    if code_str:
        code_hash = sum((idx + 1) * ord(c) for idx, c in enumerate(code_str))
    else:
        code_hash = sum(ord(c) for c in desc) if desc else 0

    for key, urls in CURATED_PRODUCT_IMAGES.items():
        if key in desc:
            return urls[code_hash % len(urls)]

    cat_key = str(category).lower()
    if "bag" in cat_key:
        urls = CURATED_PRODUCT_IMAGES["bag"]
    elif "kitchen" in cat_key:
        urls = CURATED_PRODUCT_IMAGES["tea"]
    elif "lighting" in cat_key:
        urls = CURATED_PRODUCT_IMAGES["candle"]
    elif "stationery" in cat_key:
        urls = CURATED_PRODUCT_IMAGES["paper"]
    elif "kids" in cat_key:
        urls = CURATED_PRODUCT_IMAGES["toy"]
    else:
        urls = CURATED_PRODUCT_IMAGES["decor"]

    return urls[code_hash % len(urls)]


class SegmentPredictionRequest(BaseModel):
    recency: float = Field(..., ge=0)
    frequency: float = Field(..., ge=0)
    monetary: float = Field(..., ge=0)


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str


class CheckoutItem(BaseModel):
    stock_code: str
    quantity: int = Field(..., ge=1, le=10000000)


class CheckoutRequest(BaseModel):
    user_email: str
    items: list[CheckoutItem]
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    payment_method: Optional[str] = "Credit Card"
    notes: Optional[str] = None


app = FastAPI(
    title="Customer Segmentation Recommendation API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

if FRONTEND_PATH.exists():
    app.mount(
        "/frontend",
        StaticFiles(directory=FRONTEND_PATH),
        name="frontend",
    )


def _customer_id(value):
    if pd.isna(value):
        return None

    try:
        return int(float(value))
    except (TypeError, ValueError):
        return str(value)


def _round_number(value, digits=2):
    if pd.isna(value):
        return None

    return round(float(value), digits)


def _product_category(description):
    text = "" if pd.isna(description) else str(description).lower()

    if any(word in text for word in ["bag", "shopper", "tote"]):
        return "Bags & Totes"

    if any(
        word in text
        for word in [
            "cake",
            "tin",
            "jar",
            "teacup",
            "saucer",
            "bowl",
            "plate",
            "lunch",
            "baking",
            "tea set",
            "teapot",
            "snack",
            "spice",
            "pantry",
        ]
    ):
        return "Kitchen & Tableware"

    if any(
        word in text
        for word in [
            "doormat",
            "frame",
            "board",
            "sign",
            "ornament",
            "chalkboard",
            "memo",
            "wicker",
            "heart",
            "cabinet",
            "drawer",
            "chest",
        ]
    ):
        return "Home Decor"

    if any(word in text for word in ["light", "candle", "t-light", "lantern"]):
        return "Lighting & Candles"

    if any(word in text for word in ["bunting", "christmas", "party", "paper chain"]):
        return "Party & Seasonal"

    if any(
        word in text
        for word in ["paper", "craft", "card", "notebook", "wrap", "ribbon", "tag"]
    ):
        return "Stationery & Crafts"

    if any(
        word in text
        for word in [
            "rabbit",
            "dolly",
            "spaceboy",
            "girl",
            "toy",
            "playing cards",
            "harmonica",
        ]
    ):
        return "Kids & Gifts"

    return "Accessories"



def _required_file(path: Path):
    if not path.exists():
        raise HTTPException(
            status_code=500,
            detail=f"Missing required file: {path.relative_to(BASE_DIR)}",
        )


@lru_cache(maxsize=1)
def load_segments():
    _required_file(SEGMENTS_PATH)

    df = pd.read_csv(SEGMENTS_PATH)
    df["CustomerID"] = df["CustomerID"].apply(_customer_id)
    df["Recency"] = df["Recency"].astype(int)
    df["Frequency"] = df["Frequency"].astype(int)
    df["Monetary"] = df["Monetary"].astype(float)
    df["Cluster"] = df["Cluster"].astype(int)

    return df


@lru_cache(maxsize=1)
def load_transactions():
    _required_file(TRANSACTIONS_PATH)

    columns = [
        "CustomerID",
        "StockCode",
        "Description",
        "Quantity",
        "InvoiceDate",
        "UnitPrice",
        "Country",
        "TotalPrice",
    ]
    df = pd.read_csv(TRANSACTIONS_PATH, usecols=columns)
    df["CustomerID"] = df["CustomerID"].apply(_customer_id)
    df["InvoiceDate"] = pd.to_datetime(df["InvoiceDate"], errors="coerce")
    df["StockCode"] = df["StockCode"].astype(str)

    return df


@lru_cache(maxsize=1)
def load_product_info():
    transactions = load_transactions()
    product_info = (
        transactions[["StockCode", "Description"]]
        .dropna()
        .drop_duplicates(subset=["StockCode"], keep="last")
    )

    return product_info


@lru_cache(maxsize=1)
def load_product_catalog():
    transactions = load_transactions()
    catalog = (
        transactions.groupby(["StockCode", "Description"], dropna=False)
        .agg(
            price=("UnitPrice", "mean"),
            total_quantity=("Quantity", "sum"),
            revenue=("TotalPrice", "sum"),
            customer_count=("CustomerID", "nunique"),
        )
        .reset_index()
        .sort_values("revenue", ascending=False)
    )
    catalog["Category"] = catalog["Description"].apply(_product_category)

    return catalog


@lru_cache(maxsize=1)
def load_country_analytics():
    transactions = load_transactions()
    country_summary = (
        transactions.groupby("Country")
        .agg(
            total_revenue=("TotalPrice", "sum"),
            customer_count=("CustomerID", "nunique"),
            order_count=("InvoiceDate", lambda x: len(x.dt.date.unique())),
        )
        .reset_index()
        .sort_values("total_revenue", ascending=False)
    )
    total_rev = country_summary["total_revenue"].sum()
    country_summary["percentage"] = (country_summary["total_revenue"] / total_rev * 100).round(2)
    return country_summary


@lru_cache(maxsize=1)
def load_segment_metrics():
    segments = load_segments()
    metrics = (
        segments.groupby(["Cluster", "Segment"])
        .agg(
            count=("CustomerID", "count"),
            avg_recency=("Recency", "mean"),
            avg_frequency=("Frequency", "mean"),
            avg_monetary=("Monetary", "mean"),
            total_monetary=("Monetary", "sum"),
        )
        .reset_index()
    )
    for col in ["avg_recency", "avg_frequency", "avg_monetary", "total_monetary"]:
        metrics[col] = metrics[col].apply(lambda x: _round_number(x, 2))
    return metrics



@lru_cache(maxsize=1)
def load_recommendations():
    _required_file(RECOMMENDATIONS_PATH)

    df = pd.read_csv(RECOMMENDATIONS_PATH)
    df["CustomerID"] = df["CustomerID"].apply(_customer_id)
    df["RecommendedProduct"] = df["RecommendedProduct"].astype(str)
    df["Rank"] = df["Rank"].astype(int)

    return df


def attach_recommendation_descriptions(df):
    product_info = load_product_info().rename(
        columns={
            "StockCode": "RecommendedProduct",
            "Description": "RecommendedDescription",
        }
    )

    return df.merge(product_info, on="RecommendedProduct", how="left")


@lru_cache(maxsize=1)
def load_model():
    _required_file(MODEL_PATH)
    return joblib.load(MODEL_PATH)


@lru_cache(maxsize=1)
def load_item_similarity():
    transactions = load_transactions()
    user_item = transactions.pivot_table(
        index="CustomerID",
        columns="StockCode",
        values="Quantity",
        aggfunc="sum",
        fill_value=0,
    )
    user_item_binary = (user_item > 0).astype(int)
    similarity = cosine_similarity(user_item_binary.T)
    product_codes = [str(c) for c in user_item_binary.columns]
    similarity_df = pd.DataFrame(
        similarity, index=product_codes, columns=product_codes
    )
    return similarity_df


def load_users():
    if not USERS_PATH.exists():
        return {}
    try:
        with open(USERS_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def save_users(users_dict):
    try:
        USERS_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(USERS_PATH, "w", encoding="utf-8") as f:
            json.dump(users_dict, f, indent=2)
    except Exception as e:
        print(f"Error saving users: {e}")


def calculate_user_rfm_and_segment(user_email: str):
    email = user_email.strip().lower()
    all_orders = load_live_orders()
    user_orders = [o for o in all_orders if str(o.get("user_email", "")).strip().lower() == email]

    if not user_orders:
        recency = 30
        frequency = 0
        monetary = 0.0
        cluster = 2
        segment = "Potential Customers"
    else:
        now = datetime.now(timezone.utc)
        valid_dates = []
        for o in user_orders:
            if o.get("created_at"):
                try:
                    dt = datetime.fromisoformat(o["created_at"].replace("Z", "+00:00"))
                    valid_dates.append(dt)
                except Exception:
                    pass
        if valid_dates:
            latest_dt = max(valid_dates)
            days = (now - latest_dt).days
            recency = max(0, days)
        else:
            recency = 1

        frequency = len(user_orders)
        monetary = round(sum(float(o.get("total", 0.0)) for o in user_orders), 2)

        try:
            model = load_model()
            scaler = model["scaler"]
            kmeans = model["kmeans"]
            features = pd.DataFrame(
                [
                    {
                        "Recency": float(recency),
                        "Frequency": float(np.log1p(frequency)),
                        "Monetary": float(np.log1p(monetary)),
                    }
                ]
            )
            scaled = scaler.transform(features[["Recency", "Frequency", "Monetary"]])
            cluster = int(kmeans.predict(scaled)[0])
            segment = SEGMENT_NAMES.get(cluster, "Potential Customers")
        except Exception:
            cluster = 2
            segment = "Potential Customers"

    purchased_codes = set()
    for o in user_orders:
        for item in o.get("items", []):
            if item.get("stock_code"):
                purchased_codes.add(str(item["stock_code"]).strip())

    catalog = load_product_catalog()
    rec_items = []

    if purchased_codes:
        try:
            sim_df = load_item_similarity()
            candidate_scores = {}
            for code in purchased_codes:
                matched_code = None
                for col in sim_df.columns:
                    if str(col).strip().lower() == code.lower():
                        matched_code = str(col)
                        break
                if matched_code and matched_code in sim_df.index:
                    series = sim_df[matched_code]
                    for target_code, score in series.items():
                        target_str = str(target_code).strip()
                        if target_str.lower() not in set(c.lower() for c in purchased_codes):
                            candidate_scores[target_str] = max(
                                candidate_scores.get(target_str, 0), float(score)
                            )

            sorted_candidates = sorted(
                candidate_scores.items(), key=lambda x: x[1], reverse=True
            )[:5]
            rec_codes = [c[0].lower() for c in sorted_candidates]

            rec_rows = catalog[
                catalog["StockCode"].astype(str).str.strip().str.lower().isin(rec_codes)
            ]
            for _, r in rec_rows.iterrows():
                rec_items.append(
                    {
                        "stock_code": str(r["StockCode"]),
                        "description": None
                        if pd.isna(r["Description"])
                        else str(r["Description"]),
                        "price": _round_number(r["price"]),
                        "category": str(r["Category"]),
                        "image_url": _product_image_url(r.get("Description"), r["Category"], r["StockCode"]),
                    }
                )
        except Exception:
            pass

    if len(rec_items) < 5:
        existing_codes = set(i["stock_code"].lower() for i in rec_items)
        top_catalog = catalog[
            ~catalog["StockCode"].astype(str).str.strip().str.lower().isin(existing_codes)
        ].head(5 - len(rec_items))
        for _, r in top_catalog.iterrows():
            rec_items.append(
                {
                    "stock_code": str(r["StockCode"]),
                    "description": None
                    if pd.isna(r["Description"])
                    else str(r["Description"]),
                    "price": _round_number(r["price"]),
                    "category": str(r["Category"]),
                    "image_url": _product_image_url(r.get("Description"), r["Category"], r["StockCode"]),
                }
            )

    return {
        "email": email,
        "recency": int(recency),
        "frequency": int(frequency),
        "monetary": _round_number(monetary),
        "cluster": int(cluster),
        "segment": segment,
        "orders_count": len(user_orders),
        "recommendations": rec_items,
    }


def get_similar_products_logic(stock_code: str, limit: int = 4):
    from urllib.parse import unquote

    catalog = load_product_catalog()
    raw_code = unquote(str(stock_code)).strip()
    code_str = raw_code.lower()

    sim_df = None
    try:
        sim_df = load_item_similarity()
    except Exception:
        pass

    matched_code = None
    if sim_df is not None:
        for col in sim_df.columns:
            if str(col).strip().lower() == code_str:
                matched_code = str(col)
                break

    similar_codes = []
    if matched_code and matched_code in sim_df.index:
        series = (
            sim_df[matched_code]
            .drop(labels=[matched_code], errors="ignore")
            .sort_values(ascending=False)
        )
        similar_codes = [str(c).strip().lower() for c in series.head(limit).index]

    items = []
    if similar_codes:
        rows = catalog[
            catalog["StockCode"].astype(str).str.strip().str.lower().isin(similar_codes)
        ]
        for _, r in rows.iterrows():
            items.append(
                {
                    "stock_code": str(r["StockCode"]),
                    "description": None
                    if pd.isna(r["Description"])
                    else str(r["Description"]),
                    "price": _round_number(r["price"]),
                    "category": str(r["Category"]),
                    "image_url": _product_image_url(r.get("Description"), r["Category"], r["StockCode"]),
                    "customer_count": int(r["customer_count"]),
                }
            )

    existing_codes = set(i["stock_code"].lower() for i in items)
    existing_codes.add(code_str)

    if len(items) < limit:
        matches = catalog[
            catalog["StockCode"].astype(str).str.strip().str.lower() == code_str
        ]
        if not matches.empty:
            category = str(matches.iloc[0]["Category"])
            cat_items = catalog[
                (catalog["Category"].astype(str) == category)
                & (
                    ~catalog["StockCode"]
                    .astype(str)
                    .str.strip()
                    .str.lower()
                    .isin(existing_codes)
                )
            ].head(limit - len(items))
            for _, r in cat_items.iterrows():
                items.append(
                    {
                        "stock_code": str(r["StockCode"]),
                        "description": None
                        if pd.isna(r["Description"])
                        else str(r["Description"]),
                        "price": _round_number(r["price"]),
                        "category": str(r["Category"]),
                        "image_url": _product_image_url(r.get("Description"), r["Category"], r["StockCode"]),
                        "customer_count": int(r["customer_count"]),
                    }
                )
                existing_codes.add(str(r["StockCode"]).lower())

    if len(items) < limit:
        top_items = catalog[
            ~catalog["StockCode"]
            .astype(str)
            .str.strip()
            .str.lower()
            .isin(existing_codes)
        ].head(limit - len(items))
        for _, r in top_items.iterrows():
            items.append(
                {
                    "stock_code": str(r["StockCode"]),
                    "description": None
                    if pd.isna(r["Description"])
                    else str(r["Description"]),
                    "price": _round_number(r["price"]),
                    "category": str(r["Category"]),
                    "image_url": _product_image_url(r.get("Description"), r["Category"], r["StockCode"]),
                    "customer_count": int(r["customer_count"]),
                }
            )

    return {
        "stock_code": raw_code,
        "items": items[:limit],
    }


FIRST_NAMES = ["Arthur", "Sophia", "Oliver", "Emma", "Lucas", "Amelia", "Liam", "Mia", "Noah", "Ava", "Ethan", "Isabella", "James", "Charlotte", "Alexander", "Harper", "Benjamin", "Evelyn", "William", "Abigail", "Henry", "Emily", "Sebastian", "Elizabeth", "Jack", "Sofia", "Owen", "Avery", "Samuel", "Ella"]
LAST_NAMES = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson"]

def generate_customer_name(customer_id):
    try:
        cid = int(float(customer_id))
        fn = FIRST_NAMES[cid % len(FIRST_NAMES)]
        ln = LAST_NAMES[(cid * 7) % len(LAST_NAMES)]
        return f"{fn} {ln}"
    except Exception:
        return f"Customer #{customer_id}"


def customer_payload(row):
    cid = _customer_id(row["CustomerID"])
    return {
        "customer_id": cid,
        "name": generate_customer_name(cid),
        "recency": int(row["Recency"]),
        "frequency": int(row["Frequency"]),
        "monetary": _round_number(row["Monetary"]),
        "cluster": int(row["Cluster"]),
        "segment": row["Segment"],
    }


def recommendation_payload(row):
    return {
        "customer_id": _customer_id(row["CustomerID"]),
        "recommended_product": str(row["RecommendedProduct"]),
        "description": (
            None
            if pd.isna(row.get("RecommendedDescription"))
            else str(row.get("RecommendedDescription"))
        ),
        "rank": int(row["Rank"]),
    }


@app.get("/")
def root():
    return frontend_app()


@app.get("/app")
def frontend_app():
    index_path = FRONTEND_PATH / "index.html"
    if not index_path.exists():
        raise HTTPException(status_code=404, detail="Frontend not found")

    return FileResponse(index_path)


@app.get("/api")
def api_info():
    return {
        "name": "Customer Segmentation Recommendation API",
        "app": "/",
        "docs": "/docs",
        "health": "/api/health",
    }


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/login")
def login(payload: LoginRequest):
    email = payload.email.strip().lower()
    users = load_users()
    user = users.get(email) or DEMO_USERS.get(email)

    if not user or user["password"] != payload.password:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return {
        "email": email,
        "name": user["name"],
        "role": user.get("role", "user"),
    }


@app.post("/api/register")
def register(payload: RegisterRequest):
    email = payload.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Invalid email address")
    if len(payload.password.strip()) < 3:
        raise HTTPException(status_code=400, detail="Password must be at least 3 characters long")

    users = load_users()
    if email in users or email in DEMO_USERS:
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    existing_ids = [18288]
    for u in users.values():
        if isinstance(u, dict) and "customer_id" in u:
            existing_ids.append(int(u["customer_id"]))
    next_id = max(existing_ids) + 1 if users else 18288

    new_user = {
        "customer_id": next_id,
        "email": email,
        "password": payload.password,
        "name": payload.name.strip() or "Customer",
        "role": "user",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    users[email] = new_user
    save_users(users)

    return {
        "customer_id": next_id,
        "email": email,
        "name": new_user["name"],
        "role": "user",
    }


@app.get("/api/user/profile")
def user_profile(email: str = Query(...)):
    return calculate_user_rfm_and_segment(email)


@app.get("/api/summary")
def summary():
    segments = load_segments()
    recommendations = load_recommendations()
    users = load_users()

    live_segment_counts = {"Loyal Customers": 0, "At Risk Customers": 0, "Potential Customers": 0}
    for email in users:
        rfm_data = calculate_user_rfm_and_segment(email)
        seg = rfm_data["segment"]
        live_segment_counts[seg] = live_segment_counts.get(seg, 0) + 1

    segment_counts = (
        segments["Segment"]
        .value_counts()
        .rename_axis("segment")
        .reset_index(name="count")
        .to_dict(orient="records")
    )

    for item in segment_counts:
        seg_name = item["segment"]
        item["count"] += live_segment_counts.get(seg_name, 0)

    top_products = (
        recommendations.groupby("RecommendedProduct")
        .size()
        .reset_index(name="count")
        .sort_values("count", ascending=False)
        .head(8)
    )

    catalog = load_product_catalog()

    top_products_merged = top_products.merge(
        catalog, left_on="RecommendedProduct", right_on="StockCode", how="left"
    )

    total_live_revenue = sum(o.get("total", 0.0) for o in load_live_orders())
    country_df = load_country_analytics()
    seg_metrics_df = load_segment_metrics()

    return {
        "total_customers": int(len(segments)) + len(users),
        "total_revenue": _round_number(segments["Monetary"].sum() + total_live_revenue),
        "average_recency": _round_number(segments["Recency"].mean()),
        "average_frequency": _round_number(segments["Frequency"].mean()),
        "average_monetary": _round_number(segments["Monetary"].mean()),
        "recommendation_count": int(len(recommendations)),
        "total_transactions": 392692,
        "total_products": int(len(catalog)),
        "segment_counts": [
            {
                "segment": item["segment"],
                "count": int(item["count"]),
            }
            for item in segment_counts
        ],
        "segment_metrics": seg_metrics_df.to_dict(orient="records"),
        "top_countries": country_df.head(6).to_dict(orient="records"),
        "top_recommended_products": [
            {
                "stock_code": str(row["RecommendedProduct"]),
                "description": None if pd.isna(row.get("Description")) else str(row.get("Description")),
                "price": _round_number(row.get("price")),
                "category": str(row.get("Category", "Accessories")),
                "image_url": _product_image_url(row.get("Description"), row.get("Category", "Accessories"), row["RecommendedProduct"]),
                "count": int(row["count"]),
            }
            for _, row in top_products_merged.iterrows()
        ],
    }


@app.get("/api/analytics/countries")
def country_analytics(limit: int = Query(default=10, ge=1, le=50)):
    country_df = load_country_analytics()
    return {
        "items": country_df.head(limit).to_dict(orient="records")
    }


@app.get("/api/segments/metrics")
def segment_metrics():
    metrics_df = load_segment_metrics()
    return {
        "items": metrics_df.to_dict(orient="records")
    }



def get_user_numeric_id(email: str, uinfo: dict = None, idx: int = 0):
    email = str(email).strip().lower()
    if email == "admin@giftshop.com":
        return 18287
    if email == "user@giftshop.com":
        return 18288
    if uinfo and isinstance(uinfo, dict) and uinfo.get("customer_id"):
        try:
            return int(uinfo["customer_id"])
        except Exception:
            pass
    return 18288 + idx


@app.get("/api/customers")
def customers(
    segment: Optional[str] = Query(default=None),
    q: Optional[str] = Query(default=None, description="Search by customer ID or email"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    limit_val = _safe_int(limit, 20)
    offset_val = _safe_int(offset, 0)

    df = load_segments()
    dataset_items = []
    for _, row in df.iterrows():
        try:
            cid = int(float(row["CustomerID"]))
            item = customer_payload(row)
            item["customer_id"] = cid
            dataset_items.append(item)
        except (ValueError, TypeError):
            pass

    users = load_users()
    all_users_map = {**DEMO_USERS, **users}
    all_orders = load_live_orders()
    order_emails = sorted(list(set(str(o.get("user_email", "")).strip().lower() for o in all_orders if o.get("user_email"))))
    for em in order_emails:
        if em and em not in all_users_map:
            all_users_map[em] = {"name": "Live Customer", "role": "user"}

    live_items = []
    for idx, (email, uinfo) in enumerate(all_users_map.items()):
        rfm_data = calculate_user_rfm_and_segment(email)
        cid = get_user_numeric_id(email, uinfo, idx)
        live_items.append({
            "customer_id": cid,
            "user_email": email,
            "name": uinfo.get("name", "Registered Customer"),
            "recency": rfm_data["recency"],
            "frequency": rfm_data["frequency"],
            "monetary": rfm_data["monetary"],
            "cluster": rfm_data["cluster"],
            "segment": rfm_data["segment"],
            "is_live": True,
        })

    all_items = live_items + dataset_items

    seg_str = _safe_str(segment, None)
    q_str = _safe_str(q, None)

    if seg_str:
        all_items = [i for i in all_items if i["segment"].lower() == seg_str.lower()]

    if q_str:
        q_lower = q_str.lower()
        all_items = [
            i for i in all_items
            if q_lower in str(i["customer_id"]).lower()
            or q_lower in str(i.get("name", "")).lower()
            or q_lower in str(i.get("user_email", "")).lower()
        ]

    total = len(all_items)
    page = all_items[offset_val : offset_val + limit_val]

    return {
        "total": total,
        "limit": limit_val,
        "offset": offset_val,
        "items": page,
    }


def get_action_strategy(segment: str):
    seg = str(segment).strip()
    if seg == "Loyal Customers":
        return {
            "title": "VIP Loyalty Rewards & Early Access",
            "action": "Offer 15% VIP discount code, exclusive early access to new products, and double loyalty points.",
            "priority": "High Retention",
            "badge_color": "success"
        }
    elif seg == "At Risk Customers":
        return {
            "title": "Win-Back Campaign & Special Coupon",
            "action": "Send re-engagement email with 20% discount coupon on top recommended items to prevent churn.",
            "priority": "Urgent Re-engagement",
            "badge_color": "warning"
        }
    else:
        return {
            "title": "Welcome Discount & Product Bundle",
            "action": "Send welcome email with 10% discount on first order and showcase popular starter bundles.",
            "priority": "Conversion Focus",
            "badge_color": "info"
        }


@app.get("/api/customers/{customer_id}")
def customer_detail(customer_id: str):
    cid_str = str(customer_id).strip()
    
    # Try integer customer ID lookup
    try:
        numeric_id = int(float(cid_str))
    except (ValueError, TypeError):
        numeric_id = None

    if numeric_id is not None:
        segments = load_segments()
        matches = segments[segments["CustomerID"] == numeric_id]

        if not matches.empty:
            customer = customer_payload(matches.iloc[0])
            customer["action_strategy"] = get_action_strategy(customer["segment"])
            transactions = load_transactions()
            customer_transactions = transactions[transactions["CustomerID"] == numeric_id]

            if not customer_transactions.empty:
                country = customer_transactions["Country"].mode()
                latest = customer_transactions.sort_values("InvoiceDate", ascending=False).head(8)
                top_products = (
                    customer_transactions.groupby(["StockCode", "Description"], dropna=False)
                    .agg(quantity=("Quantity", "sum"), revenue=("TotalPrice", "sum"))
                    .reset_index()
                    .sort_values("revenue", ascending=False)
                    .head(5)
                )

                customer.update(
                    {
                        "country": None if country.empty else str(country.iloc[0]),
                        "transaction_rows": int(len(customer_transactions)),
                        "total_quantity": int(customer_transactions["Quantity"].sum()),
                        "last_purchase_date": (
                            None
                            if pd.isna(customer_transactions["InvoiceDate"].max())
                            else customer_transactions["InvoiceDate"].max().date().isoformat()
                        ),
                        "latest_purchases": [
                            {
                                "stock_code": str(row["StockCode"]),
                                "description": None
                                if pd.isna(row["Description"])
                                else str(row["Description"]),
                                "quantity": int(row["Quantity"]),
                                "unit_price": _round_number(row["UnitPrice"]),
                                "total_price": _round_number(row["TotalPrice"]),
                                "invoice_date": None
                                if pd.isna(row["InvoiceDate"])
                                else row["InvoiceDate"].isoformat(),
                            }
                            for _, row in latest.iterrows()
                        ],
                        "top_products": [
                            {
                                "stock_code": str(row["StockCode"]),
                                "description": None
                                if pd.isna(row["Description"])
                                else str(row["Description"]),
                                "quantity": int(row["quantity"]),
                                "revenue": _round_number(row["revenue"]),
                            }
                            for _, row in top_products.iterrows()
                        ],
                    }
                )

            customer["recommendations"] = get_customer_recommendations(numeric_id, limit=5)[
                "items"
            ]
            return customer

    # Check live registered user by email or numeric ID
    users = load_users()
    all_users_map = {**DEMO_USERS, **users}
    target_email = None

    for idx, (em, uinfo) in enumerate(all_users_map.items()):
        cid = get_user_numeric_id(em, uinfo, idx)
        if str(em).lower() == cid_str.lower() or (numeric_id is not None and cid == numeric_id):
            target_email = em
            break

    if target_email:
        email = target_email
        rfm_data = calculate_user_rfm_and_segment(email)
        user_info = all_users_map.get(email, {})
        all_orders = load_live_orders()
        user_orders = [o for o in all_orders if str(o.get("user_email", "")).strip().lower() == email]

        latest_purchases = []
        for ord_item in user_orders:
            for it in ord_item.get("items", []):
                latest_purchases.append({
                    "stock_code": it.get("stock_code"),
                    "description": it.get("description"),
                    "quantity": it.get("quantity", 1),
                    "unit_price": it.get("unit_price", 0.0),
                    "total_price": it.get("line_total", 0.0),
                    "invoice_date": ord_item.get("created_at"),
                })

        cid = get_user_numeric_id(email, user_info)
        return {
            "customer_id": cid,
            "user_email": email,
            "name": user_info.get("name", "Registered Customer"),
            "recency": rfm_data["recency"],
            "frequency": rfm_data["frequency"],
            "monetary": rfm_data["monetary"],
            "cluster": rfm_data["cluster"],
            "segment": rfm_data["segment"],
            "action_strategy": get_action_strategy(rfm_data["segment"]),
            "country": "Live Storefront User",
            "transaction_rows": len(latest_purchases),
            "total_quantity": sum(it["quantity"] for it in latest_purchases),
            "last_purchase_date": user_orders[-1].get("created_at") if user_orders else None,
            "latest_purchases": latest_purchases[:8],
            "top_products": latest_purchases[:5],
            "recommendations": rfm_data.get("recommendations", []),
            "is_live": True,
        }

    raise HTTPException(status_code=404, detail="Customer not found")


@app.get("/api/customers/{customer_id}/recommendations")
def get_customer_recommendations(
    customer_id: int,
    limit: int = Query(default=5, ge=1, le=20),
):
    recommendations = load_recommendations()
    rows = (
        recommendations[recommendations["CustomerID"] == customer_id]
        .sort_values("Rank")
        .head(limit)
    )
    rows = attach_recommendation_descriptions(rows)

    return {
        "customer_id": customer_id,
        "items": [recommendation_payload(row) for _, row in rows.iterrows()],
    }


@app.get("/api/recommendations/top")
def top_recommendations(limit: int = Query(default=10, ge=1, le=50)):
    recommendations = load_recommendations()
    catalog = load_product_catalog()
    top = (
        recommendations.groupby("RecommendedProduct")
        .size()
        .reset_index(name="count")
        .sort_values("count", ascending=False)
        .head(limit)
    )
    top = top.merge(catalog, left_on="RecommendedProduct", right_on="StockCode", how="left")

    return {
        "items": [
            {
                "stock_code": str(row["RecommendedProduct"]),
                "description": None
                if pd.isna(row.get("Description"))
                else str(row.get("Description")),
                "price": _round_number(row.get("price")),
                "category": str(row.get("Category", "Accessories")),
                "image_url": _product_image_url(row.get("Description"), row.get("Category", "Accessories"), row["RecommendedProduct"]),
                "count": int(row["count"]),
                "customer_count": int(row.get("customer_count", 0)) if not pd.isna(row.get("customer_count")) else 0,
            }
            for _, row in top.iterrows()
        ]
    }


def _safe_str(val, default=None):
    if val is None or hasattr(val, "__call__") or type(val).__name__ in ("Param", "Query", "FieldInfo"):
        return default
    return str(val)


def _safe_int(val, default=0):
    try:
        return int(val)
    except (TypeError, ValueError):
        return default


@app.get("/api/products")
def products(
    q: Optional[str] = Query(default=None, description="Search by product code or name"),
    category: Optional[str] = Query(default=None),
    sort_by: Optional[str] = Query(default="popular"),
    limit: int = Query(default=12, ge=1, le=60),
    offset: int = Query(default=0, ge=0),
):
    catalog = load_product_catalog().copy()

    q_str = _safe_str(q, None)
    cat_str = _safe_str(category, None)
    sort_str = _safe_str(sort_by, "popular")
    limit_val = _safe_int(limit, 12)
    offset_val = _safe_int(offset, 0)

    if q_str:
        catalog = catalog[
            catalog["StockCode"].astype(str).str.contains(q_str, case=False)
            | catalog["Description"].astype(str).str.contains(q_str, case=False)
        ]

    if cat_str and cat_str.lower() != "all":
        catalog = catalog[catalog["Category"].str.lower() == cat_str.lower()]

    if sort_str == "price-asc":
        catalog = catalog.sort_values("price", ascending=True)
    elif sort_str == "price-desc":
        catalog = catalog.sort_values("price", ascending=False)
    elif sort_str == "name":
        catalog = catalog.sort_values("Description", ascending=True)
    elif sort_str == "revenue":
        catalog = catalog.sort_values("revenue", ascending=False)
    else:
        catalog = catalog.sort_values("customer_count", ascending=False)

    total = int(len(catalog))
    page = catalog.iloc[offset_val : offset_val + limit_val]

    return {
        "total": total,
        "limit": limit_val,
        "offset": offset_val,
        "categories": sorted(catalog["Category"].dropna().unique().tolist()),
        "items": [
            {
                "stock_code": str(row["StockCode"]),
                "description": None
                if pd.isna(row["Description"])
                else str(row["Description"]),
                "price": _round_number(row["price"]),
                "category": str(row["Category"]),
                "image_url": _product_image_url(row.get("Description"), row["Category"], row["StockCode"]),
                "image_alt": f"{row['Category']} product photo",
                "total_quantity": int(row["total_quantity"]),
                "revenue": _round_number(row["revenue"]),
                "customer_count": int(row["customer_count"]),
            }
            for _, row in page.iterrows()
        ],
    }


from urllib.parse import unquote


@app.get("/api/products-similar")
def get_products_similar(stock_code: str = Query(...), limit: int = Query(default=4)):
    return get_similar_products_logic(stock_code, limit)


@app.get("/api/products/{stock_code:path}/similar")
def get_similar_products(stock_code: str, limit: int = 4):
    return get_similar_products_logic(stock_code, limit)



def load_live_orders():
    if not LIVE_ORDERS_PATH.exists():
        return []
    try:
        with open(LIVE_ORDERS_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []


def save_live_orders(orders_list):
    try:
        LIVE_ORDERS_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(LIVE_ORDERS_PATH, "w", encoding="utf-8") as f:
            json.dump(orders_list, f, indent=2)
    except Exception as e:
        print(f"Error saving live orders: {e}")


@app.post("/api/checkout")
def checkout(payload: CheckoutRequest):
    if not payload.items:
        raise HTTPException(status_code=400, detail="Shporta juaj është e zbrazët")

    catalog = load_product_catalog()
    invalid_codes = []
    insufficient_stock = []
    order_items = []

    for item in payload.items:
        stock_code = str(item.stock_code).strip()
        matches = catalog[catalog["StockCode"].astype(str) == stock_code]

        if matches.empty:
            invalid_codes.append(stock_code)
            continue

        row = matches.iloc[0]
        avail_stock = int(row["total_quantity"])
        if item.quantity > avail_stock:
            prod_name = "Produkt" if pd.isna(row["Description"]) else str(row["Description"])
            insufficient_stock.append(
                f"Artikulli '{prod_name}' (#{stock_code}) ka vetëm {avail_stock:,} copë në stok (kërkuat: {item.quantity:,})"
            )
            continue

        unit_price = _round_number(row["price"]) or 0
        line_total = round(unit_price * item.quantity, 2)
        category = str(row["Category"])

        order_items.append(
            {
                "stock_code": str(row["StockCode"]),
                "description": None
                if pd.isna(row["Description"])
                else str(row["Description"]),
                "category": category,
                "image_url": _product_image_url(row.get("Description"), category, row["StockCode"]),
                "unit_price": unit_price,
                "quantity": item.quantity,
                "line_total": line_total,
                "dataset_total_quantity": avail_stock,
                "dataset_customer_count": int(row["customer_count"]),
            }
        )

    if invalid_codes:
        raise HTTPException(
            status_code=400,
            detail=f"Kodi i panjohur i produktit: {', '.join(invalid_codes)}",
        )

    if insufficient_stock:
        raise HTTPException(
            status_code=400,
            detail=f"Sasia e porosisë tejkalon stokun në gjendje! {'; '.join(insufficient_stock)}",
        )

    total = round(sum(item["line_total"] for item in order_items), 2)
    created_at = datetime.now(timezone.utc).isoformat()
    order = {
        "order_id": f"GS-{uuid4().hex[:8].upper()}",
        "status": "confirmed",
        "email_sent": True,
        "created_at": created_at,
        "user_email": payload.user_email,
        "customer_name": payload.name or "GiftShop Customer",
        "phone": payload.phone or "N/A",
        "address": payload.address or "Standard Shipping Address",
        "payment_method": payload.payment_method or "Credit Card",
        "notes": payload.notes or "",
        "item_count": sum(item["quantity"] for item in order_items),
        "total": total,
        "currency": "GBP",
        "source": "Storefront Live Checkout",
        "items": order_items,
    }
    
    orders_list = load_live_orders()
    orders_list.append(order)
    save_live_orders(orders_list)
    ORDERS.append(order)

    return order


@app.get("/api/orders")
def orders():
    orders_list = load_live_orders()
    total_orders = len(orders_list)
    total_revenue = round(sum(o.get("total", 0) for o in orders_list), 2)
    total_items = sum(o.get("item_count", 0) for o in orders_list)
    avg_order_value = round(total_revenue / total_orders, 2) if total_orders > 0 else 0.0

    return {
        "total": total_orders,
        "total_revenue": total_revenue,
        "total_items": total_items,
        "average_order_value": avg_order_value,
        "items": list(reversed(orders_list)),
    }


@app.get("/api/orders/{order_id}")
def order_detail(order_id: str):
    orders_list = load_live_orders()
    matches = [o for o in orders_list if str(o.get("order_id")).lower() == str(order_id).lower()]
    if not matches:
        raise HTTPException(status_code=404, detail="Order not found")
    return matches[0]


@app.get("/api/product-categories")
def product_categories():
    catalog = load_product_catalog()
    summary = (
        catalog.groupby("Category")
        .agg(
            count=("StockCode", "count"),
            total_quantity=("total_quantity", "sum"),
            revenue=("revenue", "sum"),
        )
        .reset_index()
        .sort_values("count", ascending=False)
    )

    return {
        "items": [
            {
                "category": str(row["Category"]),
                "count": int(row["count"]),
                "total_quantity": int(row["total_quantity"]),
                "revenue": _round_number(row["revenue"]),
            }
            for _, row in summary.iterrows()
        ]
    }


@app.post("/api/predict-segment")
def predict_segment(payload: SegmentPredictionRequest):
    model = load_model()
    scaler = model["scaler"]
    kmeans = model["kmeans"]

    features = pd.DataFrame(
        [
            {
                "Recency": payload.recency,
                "Frequency": np.log1p(payload.frequency),
                "Monetary": np.log1p(payload.monetary),
            }
        ]
    )
    scaled = scaler.transform(features[["Recency", "Frequency", "Monetary"]])
    cluster = int(kmeans.predict(scaled)[0])
    segment = SEGMENT_NAMES.get(cluster, f"Cluster {cluster}")

    return {
        "cluster": cluster,
        "segment": segment,
        "action_strategy": get_action_strategy(segment),
    }
