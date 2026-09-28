from datetime import datetime, timedelta
from decimal import Decimal

from database import get_connection


# ============================================================
# ANALYTICS DATABASE INITIALIZATION
# ============================================================

def init_analytics_database():
    conn = get_connection()

    try:
        with conn.cursor() as cur:

            cur.execute("""
                CREATE TABLE IF NOT EXISTS analytics_business_profiles (
                    user_id VARCHAR(24) PRIMARY KEY,
                    business_name VARCHAR(255),
                    industry VARCHAR(255),
                    currency VARCHAR(10) DEFAULT 'ETB',

                    starting_revenue NUMERIC(18, 2) DEFAULT 0,
                    starting_expenses NUMERIC(18, 2) DEFAULT 0,
                    starting_customers INTEGER DEFAULT 0,
                    starting_employees INTEGER DEFAULT 0,

                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            cur.execute("""
                CREATE TABLE IF NOT EXISTS analytics_transactions (
                    id BIGSERIAL PRIMARY KEY,

                    user_id VARCHAR(24) NOT NULL,

                    transaction_type VARCHAR(30) NOT NULL,

                    amount NUMERIC(18, 2) DEFAULT 0,

                    description TEXT,
                    category VARCHAR(255),

                    customer_count INTEGER DEFAULT 0,
                    employee_count INTEGER DEFAULT 0,

                    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_analytics_transactions_user
                ON analytics_transactions(user_id)
            """)

            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_analytics_transactions_date
                ON analytics_transactions(transaction_date)
            """)

            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_analytics_transactions_type
                ON analytics_transactions(transaction_type)
            """)

        conn.commit()

    finally:
        conn.close()


# ============================================================
# BUSINESS PROFILE
# ============================================================

def create_or_update_business_profile(
    user_id,
    business_name=None,
    industry=None,
    currency="ETB",
    starting_revenue=0,
    starting_expenses=0,
    starting_customers=0,
    starting_employees=0
):
    conn = get_connection()

    try:
        with conn.cursor() as cur:

            cur.execute("""
                INSERT INTO analytics_business_profiles (
                    user_id,
                    business_name,
                    industry,
                    currency,
                    starting_revenue,
                    starting_expenses,
                    starting_customers,
                    starting_employees
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)

                ON CONFLICT (user_id)
                DO UPDATE SET
                    business_name = EXCLUDED.business_name,
                    industry = EXCLUDED.industry,
                    currency = EXCLUDED.currency,
                    starting_revenue = EXCLUDED.starting_revenue,
                    starting_expenses = EXCLUDED.starting_expenses,
                    starting_customers = EXCLUDED.starting_customers,
                    starting_employees = EXCLUDED.starting_employees,
                    updated_at = CURRENT_TIMESTAMP
            """, (
                user_id,
                business_name,
                industry,
                currency,
                starting_revenue,
                starting_expenses,
                starting_customers,
                starting_employees
            ))

        conn.commit()

        return get_business_profile(user_id)

    finally:
        conn.close()


def get_business_profile(user_id):
    conn = get_connection()

    try:
        with conn.cursor() as cur:

            cur.execute("""
                SELECT
                    user_id,
                    business_name,
                    industry,
                    currency,
                    starting_revenue,
                    starting_expenses,
                    starting_customers,
                    starting_employees,
                    created_at,
                    updated_at
                FROM analytics_business_profiles
                WHERE user_id = %s
            """, (user_id,))

            row = cur.fetchone()

            if not row:
                return None

            return {
                "user_id": row[0],
                "business_name": row[1],
                "industry": row[2],
                "currency": row[3],
                "starting_revenue": float(row[4] or 0),
                "starting_expenses": float(row[5] or 0),
                "starting_customers": row[6] or 0,
                "starting_employees": row[7] or 0,
                "created_at": row[8].isoformat() if row[8] else None,
                "updated_at": row[9].isoformat() if row[9] else None
            }

    finally:
        conn.close()


# ============================================================
# ADD ANALYTICS EVENT
# ============================================================

def add_analytics_transaction(
    user_id,
    transaction_type,
    amount=0,
    description=None,
    category=None,
    customer_count=0,
    employee_count=0,
    transaction_date=None
):
    allowed_types = {
        "revenue",
        "expense",
        "sale",
        "customer",
        "employee"
    }

    if transaction_type not in allowed_types:
        raise ValueError(
            f"Invalid transaction type. "
            f"Allowed types: {', '.join(sorted(allowed_types))}"
        )

    if transaction_date is None:
        transaction_date = datetime.now()

    conn = get_connection()

    try:
        with conn.cursor() as cur:

            cur.execute("""
                INSERT INTO analytics_transactions (
                    user_id,
                    transaction_type,
                    amount,
                    description,
                    category,
                    customer_count,
                    employee_count,
                    transaction_date
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, transaction_date
            """, (
                user_id,
                transaction_type,
                amount,
                description,
                category,
                customer_count,
                employee_count,
                transaction_date
            ))

            row = cur.fetchone()

        conn.commit()

        return {
            "id": row[0],
            "transaction_date": row[1].isoformat()
                if row[1] else None
        }

    finally:
        conn.close()


# ============================================================
# CALCULATE ANALYTICS
# ============================================================

def calculate_analytics(user_id):
    profile = get_business_profile(user_id)

    if not profile:
        return {
            "profile": None,
            "total_revenue": 0,
            "total_expenses": 0,
            "profit": 0,
            "profit_margin": 0,
            "customers": 0,
            "employees": 0,
            "sales": 0,
            "last_30_days": {
                "revenue": 0,
                "expenses": 0,
                "profit": 0
            },
            "recent_activities": []
        }

    conn = get_connection()

    try:
        with conn.cursor() as cur:

            # ------------------------------------------------
            # ALL-TIME TOTALS
            # ------------------------------------------------

            cur.execute("""
                SELECT
                    COALESCE(
                        SUM(
                            CASE
                                WHEN transaction_type IN ('revenue', 'sale')
                                THEN amount
                                ELSE 0
                            END
                        ), 0
                    ),

                    COALESCE(
                        SUM(
                            CASE
                                WHEN transaction_type = 'expense'
                                THEN amount
                                ELSE 0
                            END
                        ), 0
                    ),

                    COALESCE(
                        SUM(customer_count), 0
                    ),

                    COALESCE(
                        SUM(employee_count), 0
                    ),

                    COUNT(
                        CASE
                            WHEN transaction_type = 'sale'
                            THEN 1
                        END
                    )

                FROM analytics_transactions
                WHERE user_id = %s
            """, (user_id,))

            row = cur.fetchone()

            transaction_revenue = Decimal(row[0] or 0)
            transaction_expenses = Decimal(row[1] or 0)
            added_customers = row[2] or 0
            added_employees = row[3] or 0
            sales = row[4] or 0

            total_revenue = (
                Decimal(str(profile["starting_revenue"]))
                + transaction_revenue
            )

            total_expenses = (
                Decimal(str(profile["starting_expenses"]))
                + transaction_expenses
            )

            customers = (
                profile["starting_customers"]
                + added_customers
            )

            employees = (
                profile["starting_employees"]
                + added_employees
            )

            profit = total_revenue - total_expenses

            if total_revenue > 0:
                profit_margin = (
                    profit / total_revenue
                ) * 100
            else:
                profit_margin = Decimal("0")

            # ------------------------------------------------
            # LAST 30 DAYS
            # ------------------------------------------------

            thirty_days_ago = datetime.now() - timedelta(days=30)

            cur.execute("""
                SELECT
                    COALESCE(
                        SUM(
                            CASE
                                WHEN transaction_type IN ('revenue', 'sale')
                                THEN amount
                                ELSE 0
                            END
                        ), 0
                    ),

                    COALESCE(
                        SUM(
                            CASE
                                WHEN transaction_type = 'expense'
                                THEN amount
                                ELSE 0
                            END
                        ), 0
                    )

                FROM analytics_transactions

                WHERE user_id = %s
                AND transaction_date >= %s
            """, (
                user_id,
                thirty_days_ago
            ))

            recent_row = cur.fetchone()

            last_30_revenue = Decimal(recent_row[0] or 0)
            last_30_expenses = Decimal(recent_row[1] or 0)
            last_30_profit = (
                last_30_revenue - last_30_expenses
            )

            # ------------------------------------------------
            # RECENT ACTIVITY
            # ------------------------------------------------

            cur.execute("""
                SELECT
                    id,
                    transaction_type,
                    amount,
                    description,
                    category,
                    customer_count,
                    employee_count,
                    transaction_date
                FROM analytics_transactions
                WHERE user_id = %s
                ORDER BY transaction_date DESC
                LIMIT 20
            """, (user_id,))

            activities = []

            for activity in cur.fetchall():

                activities.append({
                    "id": activity[0],
                    "type": activity[1],
                    "amount": float(activity[2] or 0),
                    "description": activity[3],
                    "category": activity[4],
                    "customer_count": activity[5] or 0,
                    "employee_count": activity[6] or 0,
                    "date": activity[7].isoformat()
                        if activity[7] else None
                })

            return {
                "profile": profile,

                "currency": profile["currency"],

                "total_revenue": float(total_revenue),
                "total_expenses": float(total_expenses),
                "profit": float(profit),

                "profit_margin": round(
                    float(profit_margin),
                    2
                ),

                "customers": customers,
                "employees": employees,
                "sales": sales,

                "last_30_days": {
                    "revenue": float(last_30_revenue),
                    "expenses": float(last_30_expenses),
                    "profit": float(last_30_profit)
                },

                "recent_activities": activities
            }

    finally:
        conn.close()