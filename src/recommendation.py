import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity


def create_user_item_matrix(df):
    """
    Create Customer x Product purchase matrix.
    """

    user_item = df.pivot_table(
        index="CustomerID",
        columns="StockCode",
        values="Quantity",
        aggfunc="sum",
        fill_value=0
    )

    return user_item


def create_binary_matrix(user_item):
    """
    Convert purchase quantities into binary values:
    1 = purchased
    0 = not purchased
    """

    return (user_item > 0).astype(int)


def calculate_item_similarity(user_item_binary):
    """
    Calculate cosine similarity between products.
    """

    similarity = cosine_similarity(user_item_binary.T)

    product_codes = user_item_binary.columns

    similarity_df = pd.DataFrame(
        similarity,
        index=product_codes,
        columns=product_codes
    )

    return similarity_df


def get_product_info(df):
    """
    Get product descriptions for each StockCode.
    """

    product_info = df[
        ["StockCode", "Description"]
    ].drop_duplicates()

    return product_info


def recommend_products(
    product_code,
    item_similarity_df,
    product_info,
    n=5
):
    """
    Recommend products similar to a given product.
    """

    if product_code not in item_similarity_df.index:
        return pd.DataFrame(
            columns=[
                "StockCode",
                "Similarity",
                "Description"
            ]
        )

    similarities = item_similarity_df[product_code].copy()

    # Remove the product itself
    similarities = similarities.drop(product_code)

    # Sort by similarity
    top_products = (
        similarities
        .sort_values(ascending=False)
        .head(n)
    )

    recommendations = top_products.reset_index()

    recommendations.columns = [
        "StockCode",
        "Similarity"
    ]

    recommendations = recommendations.merge(
        product_info,
        on="StockCode",
        how="left"
    )

    return recommendations


def get_customer_products(
    customer_id,
    user_item_binary
):
    """
    Get all products purchased by a customer.
    """

    if customer_id not in user_item_binary.index:
        return []

    products = user_item_binary.loc[customer_id]

    products = products[
        products > 0
    ].index.tolist()

    return products


def recommend_for_customer(
    customer_id,
    user_item_binary,
    item_similarity_df,
    n=5
):
    """
    Generate product recommendations for a customer
    based on products they have already purchased.
    """

    customer_products = get_customer_products(
        customer_id,
        user_item_binary
    )

    if not customer_products:
        return pd.DataFrame(
            columns=[
                "StockCode",
                "Similarity",
                "SourceProduct"
            ]
        )

    recommendations = []

    for product in customer_products:

        if product not in item_similarity_df.index:
            continue

        similar_products = (
            item_similarity_df[product]
            .drop(product)
            .sort_values(ascending=False)
            .head(n)
        )

        for recommended_product, similarity in (
            similar_products.items()
        ):

            recommendations.append({
                "StockCode": recommended_product,
                "Similarity": similarity,
                "SourceProduct": product
            })

    if not recommendations:
        return pd.DataFrame(
            columns=[
                "StockCode",
                "Similarity",
                "SourceProduct"
            ]
        )

    recommendations_df = pd.DataFrame(
        recommendations
    )

    # Don't recommend products already purchased
    recommendations_df = recommendations_df[
        ~recommendations_df["StockCode"].isin(
            customer_products
        )
    ]

    # Rank recommendations
    recommendations_df = (
        recommendations_df
        .groupby("StockCode", as_index=False)
        ["Similarity"]
        .mean()
        .sort_values(
            "Similarity",
            ascending=False
        )
    )

    return recommendations_df.head(n)