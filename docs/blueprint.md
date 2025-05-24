# **App Name**: NutriSleuth

## Core Features:

- Query Input: Accepts product name, barcode, or ingredient list with minimal validation. Normalize inputs on the backend. Provide guiding error messages (e.g., "Looks like your barcode might be incorrect. Try entering the product name instead!"). To make it radically easy, add image-based input—allow users to upload a photo of the product label or barcode. Use OCR (e.g., Tesseract) to extract text or barcode numbers.
- Data Ingestion: Extracts data from multiple data sources (Open Food Facts, USDA FoodData Central, PubChem, PubMed, ScienceDirect, arXiv, FSSAI, FDA, EFSA, Reddit, StackExchange, Brave Search API, DuckDuckGo). Implements retry logic for failed API calls or scraping attempts using exponential backoff. Cache fallback data in a local SQLite database for sources that frequently fail.
- Semantic Search: Perform semantic search with InstructorXL/E5/BGE models. Handle Milvus failures with a clear error message. Add auto-suggestions for product names using a trie-based approach.This tool refines search based on context.
- AI Analysis Tool: Use Ollama for health analysis. Handle failures with partial reports. Retry once if the output is empty. Add a simplified summary of the analysis. This tool reasons about health impacts.
- Health Report Generation: Presents a comprehensive health report with a breakdown of ingredients, potential health effects, and regulatory status, sourced from the analysis. Add a confidence score to the health report based on the quality and recency of data sources. Include a sources field in the report to show where the data came from.

## Style Guidelines:

- Primary color: Forest Green (#3B8242), symbolizing health and nature.
- Background color: Light Beige (#F5F5DC), to give a clean and natural feel.
- Accent color: Muted Orange (#D4A373), highlighting important information such as warnings.