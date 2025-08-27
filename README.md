# 🍽️ Menuto - AI-Powered Menu Recommendations

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

## 🚀 Quick Start

### Backend (API Server)
```bash
cd menuto-backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8080
```

### Frontend (Mobile App)
```bash
cd menuto-app
npm install
npx expo start
```

## 🎯 Features

- **📸 Menu Parsing**: Upload photos or website URLs of restaurant menus
- **🤖 AI Recommendations**: Multi-factor recommendation engine with personal taste matching
- **📱 Mobile App**: React Native app with camera integration
- **⭐ Rating System**: Multi-dimensional dish rating (taste, spice, portion, etc.)
- **🔍 Smart Filtering**: Budget, occasion, and dietary constraint filtering

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