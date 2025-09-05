#!/bin/bash

echo "🔐 Menuto Authentication Test Script"
echo "====================================="
echo ""

echo "1. Testing health endpoint (should return 200):"
curl -sSf http://localhost:8080/health
echo -e "\n"

echo "2. Testing whoami endpoint without token (should return 401):"
curl -sSf http://localhost:8080/__whoami
echo -e "\n"

echo "3. To test with a real token:"
echo "   a) Get a token from your Expo app console logs (look for 'JWT head')"
echo "   b) Run: TOKEN='your-token-here'"
echo "   c) Run: curl -H \"Authorization: Bearer \$TOKEN\" http://localhost:8080/__whoami"
echo ""

echo "4. Expected JWT payload should contain:"
echo "   - \"iss\": \"https://first-stag-44.clerk.accounts.dev\""
echo "   - \"aud\": \"menuto-backend\""
echo "   - \"sub\": \"user_...\""
echo ""

echo "5. If you get 401, check:"
echo "   - Custom signing key is OFF in Clerk"
echo "   - Token lifetime is > 60s"
echo "   - Audience is set to 'menuto-backend'"
echo "   - You signed out and back in to get a fresh token"
echo ""

echo "6. To test user preferences endpoint:"
echo "   curl -H \"Authorization: Bearer \$TOKEN\" http://localhost:8080/users/user_31vOvwcDdZGL5h7JUvWMUk3raR2/preferences"
echo ""
