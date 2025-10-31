import React, { useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

// Instructions: Replace TestIds.ADAPTIVE_BANNER with your actual AdMob Ad Unit ID
// Get it from: https://apps.admob.com/
// Format: ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY

const adUnitId = __DEV__ ? TestIds.ADAPTIVE_BANNER : 'YOUR_AD_UNIT_ID_HERE';

export default function AdBanner() {
  return (
    <View style={styles.container}>
      <BannerAd
        unitId={adUnitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1e293b',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    alignItems: 'center',
  },
});