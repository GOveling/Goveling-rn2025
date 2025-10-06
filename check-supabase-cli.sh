#!/bin/bash

echo "🔍 Checking Supabase CLI status and version..."

# Check if Supabase CLI is installed and working
if command -v supabase >/dev/null 2>&1; then
    echo "✅ Supabase CLI is installed"
    echo "📦 Version: $(supabase --version)"
    
    echo ""
    echo "🔗 Checking project status..."
    supabase status
    
    echo ""
    echo "📋 Listing migrations..."
    supabase migration list
    
    echo ""
    echo "🔄 Checking remote migrations..."
    supabase migration list --remote
    
else
    echo "❌ Supabase CLI is not installed"
    echo "💡 Installing Supabase CLI..."
    
    # Try to install via Homebrew
    if command -v brew >/dev/null 2>&1; then
        echo "📦 Installing via Homebrew..."
        brew install supabase/tap/supabase
    else
        echo "📦 Installing via npm..."
        npm install -g @supabase/cli
    fi
    
    echo "✅ Installation complete"
    echo "📦 Version: $(supabase --version)"
fi

echo ""
echo "🎯 Summary:"
echo "   - CLI Status: $(command -v supabase >/dev/null 2>&1 && echo "✅ Working" || echo "❌ Not working")"
echo "   - Project Directory: $(pwd)"
echo "   - Config File: $(test -f supabase/config.toml && echo "✅ Found" || echo "❌ Missing")"
