# Menuto - AI-Powered Menu Recommendations

Upload a menu → AI analyzes it → blends web reviews, your taste history, and collaborative filtering → ranks dishes with explanations.

## Features

- **Menu OCR**: Upload menu photos and extract structured dish data using GPT-4
- **Review Ingestion**: Pull reviews from Google Places and Yelp APIs
- **LLM Enhancement**: Extract sentiment and food attributes from review text
- **Collaborative Filtering**: K-means clustering to find users with similar taste
- **Personalized Ranking**: Multi-factor scoring with explainable recommendations

## Quick Start

1. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Set up environment**:
   ```bash
   cp .env.example .env
   # Fill in your API keys
   ```

3. **Set up PostgreSQL database**:
   ```bash
   # Create database
   createdb menuto
   ```

4. **Run the API**:
   ```bash
   uvicorn app.main:app --reload
   ```

## API Endpoints

### Menu Upload
```bash
POST /restaurants/upload-menu
# Upload menu image + restaurant name
# Returns parsed dishes with ingredients, prices, categories
```

### Review Ingestion
```bash
POST /reviews/{restaurant_id}/ingest
# Pull reviews from Google/Yelp for a restaurant
# Enriches with LLM sentiment analysis
```

### Personalized Recommendations
```bash
GET /recommendations/{restaurant_id}?user_id=1&budget=50&occasion=date_night
# Returns ranked dishes with explanations
# Factors: personal taste + reviews + similar users + context
```

### User Ratings
```bash
POST /dishes/{dish_id}/rate
# User rates dish with detailed feedback (spiciness, saltiness, etc.)
# Updates personal taste profile
```

## Architecture

### Data Flow
1. **Menu Upload** → OCR → GPT-4 parsing → Structured dishes
2. **Review Ingestion** → Google/Yelp APIs → GPT-3.5 enrichment → Sentiment + attributes
3. **Collaborative Filtering** → K-means clustering on reviewer taste profiles
4. **Ranking Engine** → Multi-factor scoring with explainable results

### Scoring Algorithm
```
DishScore = 0.35×PersonalMatch + 0.30×ReviewConsensus + 0.25×SocialAffinity + 0.10×ContextFit

- PersonalMatch: Your taste preferences + dietary restrictions
- ReviewConsensus: Recent review ratings with sentiment weighting  
- SocialAffinity: Similar users' ratings + cluster preferences
- ContextFit: Budget, occasion, dietary constraints
```

## Database Schema

### Core Models
- `Restaurant`: Basic info + Google/Yelp IDs
- `Dish`: Menu items with ingredients, prices, dietary tags
- `Review`: Platform reviews with LLM-enriched attributes
- `User`: Taste preferences + learned embeddings
- `ReviewerProfile`: Clustered taste profiles from public reviews

### Taste Learning
- Users build taste profiles through ratings and feedback
- Reviewers clustered by preference patterns (spicy food lovers, etc.)
- Collaborative filtering matches users to similar reviewer clusters

## Development

### Add New Features
1. Create new router in `app/routers/`
2. Add business logic in `app/services/` 
3. Update `app/main.py` to include router

### Update Collaborative Filtering
```bash
POST /recommendations/update-collaborative-filtering
# Retrains K-means clusters with latest review data
```

## Production Notes

- Set up Redis for caching expensive LLM calls
- Use background tasks for review ingestion
- Rate limit API calls to Google/Yelp
- Monitor OpenAI token usage