#!/bin/bash

# Deployment Script - Fase 1: Edge Function Optimization
# Project: iwsuyrlrbmnbfyfkqowl

echo "Starting deployment of optimized google-places-enhanced function..."

# Set Supabase credentials
export SUPABASE_ACCESS_TOKEN="sbp_457b13bbe793ef1c117726faabce557a31549978"
export SUPABASE_PROJECT_REF="iwsuyrlrbmnbfyfkqowl"

# Login to Supabase (if needed)
echo "Logging in to Supabase..."
supabase login --token $SUPABASE_ACCESS_TOKEN

# Link to project
echo "Linking to project $SUPABASE_PROJECT_REF..."
supabase link --project-ref $SUPABASE_PROJECT_REF

# Deploy the function
echo "Deploying google-places-enhanced function..."
supabase functions deploy google-places-enhanced --project-ref $SUPABASE_PROJECT_REF

echo ""
echo "Deployment completed!"
echo ""
echo "Test the function with:"
echo "curl -X POST https://iwsuyrlrbmnbfyfkqowl.supabase.co/functions/v1/google-places-enhanced \\"
echo "  -H 'Authorization: Bearer [ANON_KEY]' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"input\":\"\",\"selectedCategories\":[\"restaurant\"],\"userLocation\":{\"lat\":40.68858,\"lng\":-74.044442}}'"
