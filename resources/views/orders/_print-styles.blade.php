<style>
    * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
    }

    body {
        font-family: Arial, sans-serif;
        font-size: 12px;
        line-height: 1.4;
        color: #333;
        padding: 20px;
        background: #fff;
    }

    .print-header {
        text-align: center;
        margin-bottom: 30px;
        border-bottom: 2px solid #333;
        padding-bottom: 15px;
    }

    .print-header h1 {
        font-size: 24px;
        margin-bottom: 10px;
        color: #d32f2f;
    }

    .print-header .order-number {
        font-size: 18px;
        font-weight: bold;
    }

    .split-group-note {
        text-align: center;
        margin-bottom: 20px;
        padding: 10px;
        background: #fff3e0;
        border: 1px solid #ffd9b0;
        border-radius: 5px;
        font-weight: bold;
        color: #e65100;
    }

    .order-block + .order-block {
        margin-top: 40px;
        padding-top: 20px;
        border-top: 3px dashed #ccc;
    }

    .page-break-before {
        page-break-before: always;
    }

    .order-info {
        margin-bottom: 20px;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
    }

    .info-section {
        background: #f5f5f5;
        padding: 15px;
        border-radius: 5px;
    }

    .info-section h3 {
        font-size: 14px;
        margin-bottom: 10px;
        color: #d32f2f;
        border-bottom: 1px solid #ddd;
        padding-bottom: 5px;
    }

    .info-row {
        margin-bottom: 8px;
        display: flex;
        justify-content: space-between;
    }

    .info-label {
        font-weight: bold;
        margin-right: 10px;
    }

    .products-section {
        margin-bottom: 30px;
    }

    .products-section h2 {
        font-size: 18px;
        margin-bottom: 15px;
        color: #d32f2f;
        border-bottom: 2px solid #333;
        padding-bottom: 5px;
    }

    .product-item {
        display: flex;
        margin-bottom: 15px;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 5px;
        background: #fafafa;
    }

    .product-image {
        width: 80px;
        height: 80px;
        object-fit: cover;
        border: 1px solid #ddd;
        border-radius: 3px;
        margin-right: 15px;
        flex-shrink: 0;
    }

    .product-details {
        flex: 1;
        display: grid;
        grid-template-columns: 2fr 1fr 1fr 1fr;
        gap: 10px;
        align-items: center;
    }

    .product-details--grouped {
        grid-template-columns:
            minmax(100px, 2fr)
            minmax(0, 1fr)
            minmax(0, 1fr)
            minmax(0, 1fr)
            minmax(0, 1fr)
            minmax(0, 1fr)
            minmax(0, 1fr);
        align-items: flex-start;
        gap: 8px 10px;
    }

    .product-details__main {
        min-width: 0;
    }

    .product-variant-col {
        text-align: right;
        font-size: 12px;
    }

    .product-variant-col__label {
        display: block;
        font-weight: bold;
        margin-bottom: 6px;
        font-size: 12px;
    }

    .product-variant-col__lines > div + div {
        margin-top: 5px;
    }

    .product-variant-col__lines {
        line-height: 1.4;
        color: #333;
    }

    .product-name {
        font-weight: bold;
        font-size: 13px;
    }

    .product-id {
        font-size: 11px;
        color: #666;
        margin-top: 3px;
    }

    .product-tags {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        margin-top: 8px;
    }

    .product-tag {
        font-size: 10px;
        font-weight: 700;
        padding: 3px 8px;
        border-radius: 999px;
        text-transform: uppercase;
        letter-spacing: 0.2px;
    }

    .product-tag--rebaja {
        background: #ffebee;
        color: #b71c1c;
    }

    .product-tag--nuevo {
        background: #e8f5e9;
        color: #1b5e20;
    }

    .product-tag--proximamente {
        background: #fff3e0;
        color: #e65100;
    }

    .product-tags .catalog-offer-badge.catalog-new-badge {
        display: inline-block;
        background: #000000;
        color: #ffffff;
        padding: 3px 8px;
        border-radius: 3px;
        font-size: 10px;
        font-weight: 600;
        text-transform: none;
        letter-spacing: 0.2px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.25);
    }

    .product-quantity,
    .product-price,
    .product-subtotal {
        text-align: right;
        font-size: 12px;
    }

    .product-subtotal {
        font-weight: bold;
    }

    .product-item__breakdown-table-wrapper {
        grid-column: 1 / -1;
        overflow-x: auto;
        margin-top: 8px;
        border: 1px solid #e9ecef;
        border-radius: 0.5rem;
        background: white;
    }

    .product-item__breakdown-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.9rem;
    }

    .product-item__breakdown-table thead {
        background-color: #f8f9fa;
    }

    .product-item__breakdown-table th {
        padding: 0.6rem 0.8rem;
        text-align: left;
        font-weight: 600;
        color: #333;
        border-bottom: 2px solid #e9ecef;
        font-size: 0.8rem;
        text-transform: uppercase;
        letter-spacing: 0.4px;
    }

    .product-item__breakdown-table td {
        padding: 0.55rem 0.8rem;
        border-bottom: 1px solid #f1f3f4;
        color: #444;
        vertical-align: top;
        font-size: 12px;
    }

    .product-item__breakdown-table tbody tr:last-child td {
        border-bottom: none;
    }

    .delivery-pickup-notice {
        margin-top: 8px;
        padding: 8px 10px;
        border-radius: 6px;
        background: #fff3e0;
        color: #e65100;
        font-weight: 700;
        font-size: 12px;
        border: 1px solid #ffd9b0;
    }

    .summary-section {
        margin-top: 30px;
        border-top: 2px solid #333;
        padding-top: 15px;
    }

    .summary-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 10px;
        font-size: 13px;
    }

    .summary-label {
        font-weight: bold;
    }

    .summary-total {
        font-size: 18px;
        font-weight: bold;
        color: #d32f2f;
        border-top: 2px solid #333;
        padding-top: 10px;
        margin-top: 10px;
    }

    .total-pieces {
        text-align: center;
        margin: 20px 0;
        padding: 10px;
        background: #f5f5f5;
        border-radius: 5px;
        font-size: 14px;
        font-weight: bold;
    }

    .combined-summary {
        margin-top: 40px;
        padding: 15px;
        background: #f5f5f5;
        border: 2px solid #d32f2f;
        border-radius: 5px;
    }

    .combined-summary h2 {
        font-size: 16px;
        color: #d32f2f;
        margin-bottom: 10px;
    }

    @media print {
        body {
            padding: 10px;
        }

        .print-header {
            page-break-after: avoid;
        }

        .product-item {
            page-break-inside: avoid;
        }

        .summary-section {
            page-break-inside: avoid;
        }

        @page {
            margin: 1cm;
        }
    }
</style>
