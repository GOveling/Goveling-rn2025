#!/bin/bash

# Script para probar la Edge Function de direcciones
# Uso: ./test-directions.sh

FUNCTION_URL="https://iwsuyrlrbmnbfyfkqowl.supabase.co/functions/v1/directions"

echo "🧪 Testing Directions Edge Function"
echo "===================================="
echo ""

# Test 1: Walking route (debería usar OSRM gratuito)
echo "📍 Test 1: Walking route (OSRM should be used)"
echo "From: Chocolat Pastelería, Antofagasta"
echo "To: Plaza Colón, Antofagasta"
echo ""

curl -s -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "origin": [-70.4009218, -23.6638441],
    "destination": [-70.3950000, -23.6500000],
    "mode": "walking",
    "language": "es"
  }' | jq '{
    ok,
    mode,
    distance_km: (.distance_m / 1000),
    duration_min: (.duration_s / 60),
    coords_count: (.coords | length),
    steps_count: (.steps | length),
    cached,
    source
  }'

echo ""
echo "---"
echo ""

# Test 2: Driving route (debería usar OSRM gratuito)
echo "🚗 Test 2: Driving route (OSRM should be used)"
echo ""

curl -s -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "origin": [-70.4009218, -23.6638441],
    "destination": [-70.3950000, -23.6500000],
    "mode": "driving",
    "language": "es"
  }' | jq '{
    ok,
    mode,
    distance_km: (.distance_m / 1000),
    duration_min: (.duration_s / 60),
    coords_count: (.coords | length),
    cached,
    source
  }'

echo ""
echo "---"
echo ""

# Test 3: Cycling route (debería usar OSRM gratuito)
echo "🚴 Test 3: Cycling route (OSRM should be used)"
echo ""

curl -s -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "origin": [-70.4009218, -23.6638441],
    "destination": [-70.3950000, -23.6500000],
    "mode": "cycling",
    "language": "es"
  }' | jq '{
    ok,
    mode,
    distance_km: (.distance_m / 1000),
    duration_min: (.duration_s / 60),
    coords_count: (.coords | length),
    cached,
    source
  }'

echo ""
echo "---"
echo ""

# Test 4: Cache test (debería retornar cached: true)
echo "💾 Test 4: Cache test (repeat walking route)"
echo "Should return cached: true"
echo ""

curl -s -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "origin": [-70.4009218, -23.6638441],
    "destination": [-70.3950000, -23.6500000],
    "mode": "walking",
    "language": "es"
  }' | jq '{
    ok,
    mode,
    cached,
    source
  }'

echo ""
echo "---"
echo ""

# Test 5: Transit mode (debería retornar deeplinks)
echo "🚇 Test 5: Transit mode (should return deeplinks)"
echo ""

curl -s -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "origin": [-70.4009218, -23.6638441],
    "destination": [-70.3950000, -23.6500000],
    "mode": "transit",
    "language": "es"
  }' | jq

echo ""
echo "===================================="
echo "✅ Tests completed!"
echo ""
echo "Expected results:"
echo "- Tests 1-3: source should be 'osrm' (free)"
echo "- Test 4: cached should be true"
echo "- Test 5: should have deepLinks object"
