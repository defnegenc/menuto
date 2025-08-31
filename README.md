# 🍽️ Menuto

Menuto is an intelligent restaurant recommendation system that uses AI to parse menus and provide personalized dish recommendations based on taste preferences, reviews, and collaborative filtering.

## 🏗️ Project Structure

```
menuto-project/
├── README.md                 # This file
├── menuto-backend/          # FastAPI backend with AI recommendation engine
│   ├── app/                 # Main application code
│   ├── requirements.txt     # Python dependencies
│   └── README.md           # Backend setup instructions
└── menuto-app/             # React Native + TypeScript mobile app
    ├── screens/            # UI screens (Onboarding, Camera, etc.)
    ├── services/          # API integration
    ├── package.json       # Node dependencies
    └── README.md         # Frontend setup instructions
```
### Backend (API server)
```bash
cd menuto-backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8080

### Frontend (Mobile App)
```bash
cd menuto-app
npm install
npx expo start
```

# 🎯 Features

📸 Menu Parsing – photo, URL, or text → structured dishes

🤖 AI Recommendations – matches to your taste, not just ratings

📱 Mobile App – React Native app with camera + onboarding

⭐ Favorites – save dishes to build your taste profile

🔍 Smart Filters – budget, occasion, diet, etc.

# Frontend (mobile app)
cd menuto-app
npm install
npx expo start

## 🔧 Technology Stack

**Backend:**
- FastAPI (Python)
- Supabase/PostgreSQL
- OpenAI GPT-4 (menu parsing)
- Google Places API
- OCR with Tesseract

**Frontend:**
- React Native + TypeScript
- Expo
- Zustand (state management)
- Camera integration

## 📋 Development Status

✅ Backend API with recommendation engine  
✅ Frontend mobile app boilerplate  
✅ Photo + URL menu input support  
🔄 Backend endpoint integration  
⏳ Production deployment
