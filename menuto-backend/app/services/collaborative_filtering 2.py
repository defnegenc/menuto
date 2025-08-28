import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import StandardScaler
from sqlalchemy.orm import Session
from app.models import Review, ReviewerProfile, Dish, Restaurant
from typing import List, Dict, Tuple
import json

class CollaborativeFilteringEngine:
    def __init__(self, n_clusters: int = 25):
        self.n_clusters = n_clusters
        self.kmeans = None
        self.scaler = StandardScaler()
        self.taste_features = [
            'avg_rating_given', 'sentiment_variance', 'spicy_preference', 
            'rich_preference', 'fresh_preference', 'crispy_preference',
            'sweet_preference', 'umami_preference'
        ]
    
    def build_reviewer_taste_vectors(self, db: Session) -> pd.DataFrame:
        """Build taste vectors for all reviewers from their review history"""
        
        # Get all reviews with enriched data
        reviews = db.query(Review).filter(Review.extracted_attributes.isnot(None)).all()
        
        reviewer_profiles = {}
        
        for review in reviews:
            reviewer_id = f"{review.platform}:{review.reviewer_external_id}"
            
            if reviewer_id not in reviewer_profiles:
                reviewer_profiles[reviewer_id] = {
                    'platform': review.platform,
                    'external_id': review.reviewer_external_id,
                    'ratings': [],
                    'sentiments': [],
                    'attributes': []
                }
            
            profile = reviewer_profiles[reviewer_id]
            profile['ratings'].append(review.rating)
            profile['sentiments'].append(review.sentiment_score)
            profile['attributes'].extend(review.extracted_attributes or [])
        
        # Convert to feature vectors
        taste_vectors = []
        reviewer_ids = []
        
        for reviewer_id, profile in reviewer_profiles.items():
            if len(profile['ratings']) < 2:  # Need at least 2 reviews
                continue
                
            # Basic stats
            avg_rating = np.mean(profile['ratings'])
            sentiment_variance = np.var(profile['sentiments'])
            
            # Attribute preferences (frequency of mentions)
            all_attrs = profile['attributes']
            total_attrs = len(all_attrs) if all_attrs else 1
            
            spicy_pref = sum(1 for attr in all_attrs if 'spicy' in attr.lower() or 'hot' in attr.lower()) / total_attrs
            rich_pref = sum(1 for attr in all_attrs if 'rich' in attr.lower() or 'creamy' in attr.lower()) / total_attrs
            fresh_pref = sum(1 for attr in all_attrs if 'fresh' in attr.lower() or 'light' in attr.lower()) / total_attrs
            crispy_pref = sum(1 for attr in all_attrs if 'crispy' in attr.lower() or 'crunchy' in attr.lower()) / total_attrs
            sweet_pref = sum(1 for attr in all_attrs if 'sweet' in attr.lower()) / total_attrs
            umami_pref = sum(1 for attr in all_attrs if 'savory' in attr.lower() or 'umami' in attr.lower()) / total_attrs
            
            vector = [
                avg_rating, sentiment_variance, spicy_pref, rich_pref, 
                fresh_pref, crispy_pref, sweet_pref, umami_pref
            ]
            
            taste_vectors.append(vector)
            reviewer_ids.append(reviewer_id)
        
        # Create DataFrame
        df = pd.DataFrame(taste_vectors, columns=self.taste_features)
        df['reviewer_id'] = reviewer_ids
        
        return df
    
    def train_clusters(self, db: Session):
        """Train K-means clusters on reviewer taste vectors"""
        
        # Build taste vectors
        taste_df = self.build_reviewer_taste_vectors(db)
        
        if len(taste_df) < self.n_clusters:
            print(f"Not enough reviewers ({len(taste_df)}) for {self.n_clusters} clusters")
            self.n_clusters = max(3, len(taste_df) // 3)
        
        # Normalize features
        X = taste_df[self.taste_features].values
        X_scaled = self.scaler.fit_transform(X)
        
        # Train K-means
        self.kmeans = KMeans(n_clusters=self.n_clusters, random_state=42)
        clusters = self.kmeans.fit_predict(X_scaled)
        
        # Update database with cluster assignments
        for i, reviewer_id in enumerate(taste_df['reviewer_id']):
            platform, external_id = reviewer_id.split(':', 1)
            
            # Find or create reviewer profile
            profile = db.query(ReviewerProfile).filter(
                ReviewerProfile.platform == platform,
                ReviewerProfile.external_id == external_id
            ).first()
            
            if not profile:
                profile = ReviewerProfile(
                    platform=platform,
                    external_id=external_id
                )
                db.add(profile)
            
            # Update with taste data
            profile.taste_vector = taste_df.iloc[i][self.taste_features].to_dict()
            profile.taste_cluster = int(clusters[i])
            profile.total_reviews = len([r for r in db.query(Review).filter(
                Review.platform == platform,
                Review.reviewer_external_id == external_id
            ).all()])
        
        db.commit()
        
        return {
            "clusters_created": self.n_clusters,
            "reviewers_clustered": len(taste_df),
            "cluster_distribution": dict(zip(*np.unique(clusters, return_counts=True)))
        }
    
    def find_similar_reviewers(self, user_taste_vector: Dict, db: Session, top_k: int = 50) -> List[Dict]:
        """Find reviewers similar to user's taste profile"""
        
        # Get all reviewer profiles with taste vectors
        profiles = db.query(ReviewerProfile).filter(
            ReviewerProfile.taste_vector.isnot(None)
        ).all()
        
        if not profiles:
            return []
        
        # Convert user vector to array
        user_features = [user_taste_vector.get(feature, 0) for feature in self.taste_features]
        user_array = np.array(user_features).reshape(1, -1)
        user_scaled = self.scaler.transform(user_array)
        
        # Calculate similarities
        similarities = []
        for profile in profiles:
            reviewer_features = [profile.taste_vector.get(feature, 0) for feature in self.taste_features]
            reviewer_array = np.array(reviewer_features).reshape(1, -1)
            reviewer_scaled = self.scaler.transform(reviewer_array)
            
            similarity = cosine_similarity(user_scaled, reviewer_scaled)[0][0]
            
            similarities.append({
                'profile': profile,
                'similarity': similarity,
                'platform': profile.platform,
                'external_id': profile.external_id,
                'cluster': profile.taste_cluster,
                'total_reviews': profile.total_reviews
            })
        
        # Sort by similarity and return top k
        similarities.sort(key=lambda x: x['similarity'], reverse=True)
        return similarities[:top_k]
    
    def get_cluster_dish_preferences(self, cluster_id: int, db: Session) -> Dict[int, float]:
        """Get average ratings for dishes from reviewers in a cluster"""
        
        # Get all reviewers in this cluster
        cluster_reviewers = db.query(ReviewerProfile).filter(
            ReviewerProfile.taste_cluster == cluster_id
        ).all()
        
        if not cluster_reviewers:
            return {}
        
        # Get their reviews
        reviewer_ids = [(r.platform, r.external_id) for r in cluster_reviewers]
        
        dish_ratings = {}
        dish_counts = {}
        
        for platform, external_id in reviewer_ids:
            reviews = db.query(Review).filter(
                Review.platform == platform,
                Review.reviewer_external_id == external_id,
                Review.dish_id.isnot(None)
            ).all()
            
            for review in reviews:
                dish_id = review.dish_id
                if dish_id not in dish_ratings:
                    dish_ratings[dish_id] = 0
                    dish_counts[dish_id] = 0
                
                dish_ratings[dish_id] += review.rating
                dish_counts[dish_id] += 1
        
        # Calculate averages
        dish_preferences = {}
        for dish_id in dish_ratings:
            if dish_counts[dish_id] >= 2:  # At least 2 reviews
                dish_preferences[dish_id] = dish_ratings[dish_id] / dish_counts[dish_id]
        
        return dish_preferences

def update_collaborative_filtering(db: Session) -> Dict:
    """Main function to update collaborative filtering model"""
    engine = CollaborativeFilteringEngine()
    result = engine.train_clusters(db)
    return result