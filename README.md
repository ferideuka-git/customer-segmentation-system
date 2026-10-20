# Customer Segmentation & Recommendation System

## 1. Project Overview

This project develops a Customer Segmentation and Product Recommendation System using the Online Retail dataset.

The main goal of the project is to analyze customer purchasing behavior, divide customers into meaningful segments, and recommend products based on customers' previous purchasing behavior.

The project combines:

- Data preprocessing
- Exploratory Data Analysis
- RFM Analysis
- Machine Learning
- Customer Segmentation
- Collaborative Filtering
- Product Recommendation
- Model Evaluation
- Power BI Dashboard

---

## 2. Dataset

The project uses the Online Retail dataset provided by the UCI Machine Learning Repository.

Dataset:

Online Retail Dataset  
UCI Machine Learning Repository

The dataset contains transactional information from an online retail store.

Main columns include:

- InvoiceNo – Invoice number
- StockCode – Product code
- Description – Product description
- Quantity – Number of products purchased
- InvoiceDate – Date and time of transaction
- UnitPrice – Price per product
- CustomerID – Customer identifier
- Country – Customer country

---

## 3. Project Structure

The project is organized as follows:

Customer-Segmentation-Recommendation/

│  
├── data/  
│   ├── raw/  
│   │   └── Online Retail.xlsx  
│   │  
│   ├── processed/  
│   │   ├── onlineRetail_cleaned.csv  
│   │   └── rfm_customers.csv  
│   │  
│   └── outputs/  
│       ├── customer_segments.csv  
│       └── recommendations.csv  
│  
├── notebooks/  
│   ├── 01_data_exploration.ipynb  
│   ├── 02_data_cleaning.ipynb  
│   ├── 03_rfm_analysis.ipynb  
│   ├── 04_customer_segmentation.ipynb  
│   └── 05_recommendation_system.ipynb  
│  
├── src/  
│   ├── dataprocessing.py  
│   ├── rfm.py  
│   ├── segmentation.py  
│   └── recommendation.py  
│  
├── models/  
│   └── customer_segmentation.pkl  
│  
├── dashboard/  
│   └── customer_segmentation.pbix  
│  
├── README.md  
│  
└── requirements.txt

---

## 4. Data Exploration

The first step of the project was to explore the original dataset.

The following checks were performed:

- Dataset dimensions
- Data types
- Missing values
- Duplicate rows
- Statistical description
- Negative quantities
- Zero or negative prices
- Missing Customer IDs
- Missing product descriptions

The original dataset was inspected to understand its structure and identify possible data quality problems before applying any machine learning techniques.

---

## 5. Data Cleaning

The dataset was cleaned before performing customer analysis.

The following preprocessing steps were performed:

### Duplicate removal

Duplicate transactions were identified and removed.

### Quantity filtering

Transactions with Quantity less than or equal to zero were removed because they do not represent valid purchases for the analysis.

### Unit price filtering

Rows with UnitPrice less than or equal to zero were removed.

### Customer ID filtering

Rows without a CustomerID were removed because customer-level analysis and segmentation require an identifiable customer.

### Total Price

A new column called `TotalPrice` was created:

TotalPrice = Quantity × UnitPrice

This value represents the total monetary value of each transaction.

The cleaned dataset was saved as:

`data/processed/onlineRetail_cleaned.csv`

---

## 6. RFM Analysis

RFM analysis was used to measure customer purchasing behavior.

RFM stands for:

- Recency
- Frequency
- Monetary

### Recency

Recency measures how recently a customer made a purchase.

It was calculated using the customer's latest purchase date and a reference date based on the latest transaction in the dataset.

Lower Recency values indicate more recent customers.

### Frequency

Frequency measures how many unique invoices a customer has made.

Unique InvoiceNo values were counted for each CustomerID.

Higher Frequency indicates that a customer purchases more frequently.

### Monetary

Monetary represents the total amount spent by a customer.

It was calculated by summing `TotalPrice` for each CustomerID.

Higher Monetary values indicate customers who generate more revenue.

The final RFM dataset contains:

- CustomerID
- Recency
- Frequency
- Monetary

The RFM dataset was saved as:

`data/processed/rfm_customers.csv`

---

## 7. Data Transformation for Machine Learning

Before applying clustering, Frequency and Monetary values were log-transformed using:

`np.log1p()`

This transformation helps reduce the effect of very large values and makes the distributions more suitable for machine learning.

After the transformation, the RFM features were standardized using `StandardScaler`.

The features used for clustering were:

- Recency
- Frequency
- Monetary

---

## 8. Customer Segmentation

K-Means clustering was used to divide customers into groups with similar purchasing behavior.

Two methods were used to determine the appropriate number of clusters:

### Elbow Method

The Elbow Method was used to analyze the inertia for different numbers of clusters.

### Silhouette Score

Silhouette Score was also calculated for K values from 2 to 10.

The highest Silhouette Score was obtained for:

`K = 3`

Therefore, three customer segments were selected.

---

## 9. Customer Segments

The three clusters were interpreted based on their RFM characteristics.

### Loyal Customers

These customers have:

- Low Recency
- High Frequency
- High Monetary value

They purchase frequently, recently, and generate high revenue.

Possible strategies:

- Loyalty programs
- VIP offers
- Personalized recommendations
- Early access to products
- Exclusive offers

### At Risk Customers

These customers have:

- High Recency
- Low Frequency
- Low Monetary value

They have not purchased recently and show relatively low purchasing activity.

Possible strategies:

- Re-engagement campaigns
- Discounts
- Personalized recommendations
- Special return offers

### Potential Customers

These customers have:

- Relatively recent purchases
- Moderate Frequency
- Moderate Monetary value

They represent customers who could potentially become loyal customers.

Possible strategies:

- Personalized recommendations
- Product offers
- Loyalty programs
- Cross-selling
- Promotional campaigns

---

## 10. Segmentation Results

The final customer distribution is:

| Segment | Number of Customers |
|---|---:|
| Loyal Customers | 1320 |
| At Risk Customers | 981 |
| Potential Customers | 2037 |

Total customers analyzed:

`4338`

The average RFM values for each segment are:

| Segment | Recency | Frequency | Monetary |
|---|---:|---:|---:|
| Loyal Customers | 30.10 | 9.84 | 5492.04 |
| At Risk Customers | 255.11 | 1.39 | 397.17 |
| Potential Customers | 54.70 | 2.05 | 612.71 |

---

## 11. Recommendation System

A product recommendation system was developed using item-based collaborative filtering.

The recommendation system uses customers' purchasing history to identify products that are frequently purchased by similar customers.

First, a Customer-Product matrix was created.

Rows represent customers and columns represent products.

The values represent the quantity of products purchased.

The matrix was then converted into a binary matrix:

- `0` = Product was not purchased
- `1` = Product was purchased

The resulting Customer-Product matrix has:

`4338 × 3665`

This means that the dataset contains 4338 customers and 3665 products in the recommendation matrix.

---

## 12. Cosine Similarity

Cosine similarity was used to calculate similarity between products.

The Customer-Product matrix was transposed so that products could be compared with each other.

The resulting Product-Product similarity matrix has:

`3665 × 3665`

Each value represents how similar two products are based on customers' purchasing behavior.

A product is not recommended to a customer if that customer has already purchased it.

---

## 13. Personalized Recommendations

For each customer:

1. The customer's previously purchased products are identified.
2. Similar products are found for each purchased product.
3. Products already purchased by the customer are removed.
4. Candidate recommendations are collected.
5. Recommendations are sorted according to similarity.
6. The top recommendations are selected.

The final recommendation output contains:

- CustomerID
- RecommendedProduct
- Rank

The recommendations were saved as:

`data/outputs/recommendations.csv`

---

## 14. Recommendation Evaluation

The recommendation system was evaluated using a train-test approach.

The transaction dates were divided into:

- Training data
- Testing data

The training data was used to generate recommendations.

The testing data was then used to determine whether recommended products were actually purchased later by the customer.

The evaluation used:

### Hit Rate

Measures the percentage of customers for whom at least one recommended product was later purchased.

### Precision@5

Measures how many of the top 5 recommendations were relevant.

### Recall@5

Measures how many relevant products from the test period were successfully recommended within the top 5 recommendations.

---

## 15. Machine Learning Model

The customer segmentation model uses:

- StandardScaler
- K-Means Clustering
- Silhouette Score
- Elbow Method

The trained segmentation model can be saved in:

`models/customer_segmentation.pkl`

The model can be reused for future customer segmentation without rebuilding the entire clustering process from the beginning.

---

## 16. Power BI Dashboard

A Power BI dashboard was created to visualize the results of the customer segmentation and recommendation system.

The dashboard contains three main pages.

### Page 1 – Customer Overview

This page provides an overview of the customer base.

It contains:

- Total Customers
- Total Revenue
- Average Recency
- Customers by Segment
- Revenue by Segment

The main purpose of this page is to provide a quick overview of the business and customer base.

### Page 2 – Customer Segmentation

This page provides a detailed analysis of customer segments.

It contains:

- Segment Distribution
- Recency by Segment
- Frequency by Segment
- Monetary by Segment
- CustomerID and Segment table
- Segment slicer

This page allows users to interactively analyze different customer groups.

### Page 3 – Recommendations

This page visualizes the product recommendation results.

It contains:

- Recommended products
- Recommendation rank
- Recommendation count by product
- Rank slicer
- Recommendation table

Users can filter recommendations according to their rank and analyze which products are recommended most frequently.

---

## 17. Technologies Used

The project was developed using:

- Python
- Pandas
- NumPy
- Scikit-learn
- Matplotlib
- Jupyter Notebook
- Visual Studio Code
- Power BI

---

## 18. Python Libraries

The main Python libraries used in the project are:

- pandas
- numpy
- scikit-learn
- matplotlib
- openpyxl
- joblib

The required libraries are listed in:

`requirements.txt`

---

## 19. Project Workflow

The complete workflow of the project is:

Raw Dataset

↓

Data Exploration

↓

Data Cleaning

↓

Processed Dataset

↓

RFM Analysis

↓

RFM Transformation

↓

Feature Scaling

↓

K-Means Clustering

↓

Customer Segmentation

↓

Product Recommendation

↓

Recommendation Evaluation

↓

CSV Outputs

↓

Power BI Dashboard

---

## 20. Final Outputs

The main outputs of the project are:

### Cleaned Dataset

`data/processed/onlineRetail_cleaned.csv`

### RFM Dataset

`data/processed/rfm_customers.csv`

### Customer Segmentation

`data/outputs/customer_segments.csv`

### Product Recommendations

`data/outputs/recommendations.csv`

### Machine Learning Model

`models/customer_segmentation.pkl`

### Power BI Dashboard

`dashboard/customer_segmentation.pbix`

---

## 21. Conclusion

The project combines customer analytics, machine learning, and recommendation systems to better understand customer behavior and support personalized product recommendations.

RFM analysis and K-Means clustering were used to identify three main customer segments:

- Loyal Customers
- At Risk Customers
- Potential Customers

An item-based collaborative filtering approach was used to recommend products based on customers' previous purchasing behavior.

The results were integrated into a Power BI dashboard to provide an interactive way of exploring customer segments, customer behavior, revenue, and product recommendations.

The system can be further extended in the future by using more advanced recommendation algorithms, additional customer features, real-time recommendations, or more advanced machine learning models.

---

## 22. Run Web App

The easiest way on Windows is to double-click:

```text
run_web_app.bat
```

Then open:

```text
http://127.0.0.1:8000
```

The web app includes:

- Dashboard summary
- Customer table
- Segment filters
- Customer details
- Product recommendations
- Segment prediction from RFM values

API docs are still available at:

```text
http://127.0.0.1:8000/docs
```

Manual setup:

Install Python dependencies:

```bash
python -m pip install --user -r requirements.txt
```

Start the FastAPI backend from the project root:

```bash
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

Open the frontend:

```text
http://127.0.0.1:8000
```
