import json

from ai import client, MODEL


# ============================================================
# BUSINESS DOCUMENT CLASSIFIER
# ============================================================

BUSINESS_CLASSIFICATION_PROMPT = """
You are ELIRA's business document classifier.

Analyze the document text and determine whether it is
business-related.

Business-related documents include things such as:

- contracts
- agreements
- invoices
- receipts
- purchase orders
- quotations
- proposals
- tax documents
- TIN documents
- bank/payment documents
- financial statements
- company registration documents
- employment documents
- partnership documents
- business correspondence
- meeting documents
- business reports

Return ONLY valid JSON.

Use this exact structure:

{
    "business_related": true,
    "category": "invoice",
    "confidence": 0.95,
    "reason": "Short explanation"
}

If the document is not business-related:

{
    "business_related": false,
    "category": "personal",
    "confidence": 0.95,
    "reason": "Short explanation"
}

Do not invent information.

The confidence must be a number between 0 and 1.
"""


async def classify_business_document(
    document_text: str
):

    if not document_text.strip():

        return {
            "business_related": False,
            "category": "unknown",
            "confidence": 0,
            "reason": "No readable document text."
        }


    response = await client.chat.completions.create(

        model=MODEL,

        messages=[

            {
                "role": "system",
                "content": BUSINESS_CLASSIFICATION_PROMPT
            },

            {
                "role": "user",
                "content": document_text
            }

        ],

        max_tokens=500
    )


    result = response.choices[0].message.content.strip()


    # --------------------------------------------------------
    # REMOVE POSSIBLE MARKDOWN JSON FENCES
    # --------------------------------------------------------

    if result.startswith("```"):

        result = result.replace(
            "```json",
            ""
        )

        result = result.replace(
            "```",
            ""
        )

        result = result.strip()


    # --------------------------------------------------------
    # PARSE JSON
    # --------------------------------------------------------

    try:

        classification = json.loads(
            result
        )

    except json.JSONDecodeError:

        return {
            "business_related": False,
            "category": "unknown",
            "confidence": 0,
            "reason": "Classifier returned invalid JSON."
        }


    return classification
  