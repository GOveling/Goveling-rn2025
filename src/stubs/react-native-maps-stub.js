// Stub for react-native-maps when running on web
// This prevents Metro from trying to bundle the incompatible native module
import React from 'react';

// Mock MapView component
function MapView(props) {
  return React.createElement(
    'div',
    {
      style: {
        height: props.style?.height || 200,
        width: props.style?.width || '100%',
        backgroundColor: '#f0f0f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid #ddd',
        borderRadius: '8px',
        ...props.style,
      },
    },
    'Map View (Web Fallback)'
  );
}

// Mock Marker component
function Marker(props) {
  return null;
}

// Mock Polyline component
function Polyline(props) {
  return null;
}

// Mock constants
export const PROVIDER_GOOGLE = 'google';
export const PROVIDER_DEFAULT = 'default';

// Export components
export { MapView as default, Marker, Polyline };

// Also export MapView as named export
export { MapView };
