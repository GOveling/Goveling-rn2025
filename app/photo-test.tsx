import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';

export default function PhotoTestPage() {
  const testPhotoUrl = "https://places.googleapis.com/v1/places/ChIJy-UDlc4pQg0RhSUkQDbRgr8/photos/AciIO2fciJ1NaypXuXViQaPvGUMDIx03vR81C57kEHG46viq67OC8WQcbT8a4_wiyEX3wspYaqq-voxPAQ5TqKcxAY4rEySX9MWAUfwtRCmHenQRybcfOfixHw65x9vOvjxAHFxd55CmNZXdUUKFVcywIdmYVaWXjIZdYWBgiA8wbCfun0GUyU3bY026LSecVYlFcXoC7_pEy-v9UdAOhmexgx__IiQYUB7lwAiYzxYfiVu1srjI0JXHbqFegUh1dtNnpyauJtQqRzQG9LnN9pJanDzZhMLSLl6kfoCo_H9BRcRyCQ/media?maxHeightPx=400&key=AIzaSyCiALieojm1xA6u9eCUvu-w1KACQzWFLKU";

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Photo Test</Text>
      <Text style={styles.subtitle}>Testing Google Places photo URL</Text>
      
      <View style={styles.photoContainer}>
        <Image
          source={{ uri: testPhotoUrl }}
          style={styles.photo}
          resizeMode="cover"
          onLoad={() => console.log('[PhotoTest] Image loaded successfully')}
          onError={(error) => console.log('[PhotoTest] Image failed to load:', error)}
        />
      </View>
      
      <Text style={styles.url}>{testPhotoUrl.slice(0, 100)}...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  photoContainer: {
    width: '100%',
    height: 200,
    backgroundColor: '#ddd',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 20,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  url: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'monospace',
  },
});
