import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, Alert, Share, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

interface Item {
  id: string;
  name: string;
  description: string;
  images: string[];
  barcode?: string;
  purchase_price: number;
  current_value: number;
  condition: string;
  is_wishlist: boolean;
  collection_id?: string;
  created_at: string;
}

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams();
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const router = useRouter();

  useEffect(() => {
    fetchItem();
  }, [id]);

  const fetchItem = async () => {
    try {
      const response = await api.get(`/items/${id}`);
      setItem(response.data);
    } catch (error) {
      console.error('Error fetching item:', error);
      Alert.alert('Error', 'Failed to load item');
    } finally {
      setLoading(false);
    }
  };

  const toggleWishlist = async () => {
    if (!item) return;
    try {
      await api.put(`/items/${id}`, { is_wishlist: !item.is_wishlist });
      setItem({ ...item, is_wishlist: !item.is_wishlist });
    } catch (error) {
      Alert.alert('Error', 'Failed to update wishlist status');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Item',
      'Are you sure you want to delete this item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/items/${id}`);
              Alert.alert('Success', 'Item deleted');
              router.back();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete item');
            }
          },
        },
      ]
    );
  };

  const handleShare = async () => {
    if (!item) return;
    try {
      await Share.share({
        message: `${item.name} - ${item.condition}\nValue: $${item.current_value.toFixed(2)}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!item) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Item not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={toggleWishlist} style={styles.iconButton}>
            <Ionicons
              name={item.is_wishlist ? 'heart' : 'heart-outline'}
              size={24}
              color={item.is_wishlist ? '#ef4444' : '#ffffff'}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShare} style={styles.iconButton}>
            <Ionicons name="share-outline" size={24} color="#ffffff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.iconButton}>
            <Ionicons name="trash-outline" size={24} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {item.images && item.images.length > 0 ? (
          <View>
            <Image
              source={{ uri: item.images[currentImageIndex] }}
              style={styles.mainImage}
            />
            {item.images.length > 1 && (
              <View style={styles.thumbnailContainer}>
                {item.images.map((image, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => setCurrentImageIndex(index)}
                  >
                    <Image
                      source={{ uri: image }}
                      style={[
                        styles.thumbnail,
                        currentImageIndex === index && styles.thumbnailActive,
                      ]}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.mainImage, styles.placeholderImage]}>
            <Ionicons name="image-outline" size={64} color="#64748b" />
          </View>
        )}

        <View style={styles.content}>
          <Text style={styles.itemName}>{item.name}</Text>
          
          <View style={styles.conditionBadge}>
            <Text style={styles.conditionText}>{item.condition.replace('_', ' ')}</Text>
          </View>

          {item.description ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{item.description}</Text>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Value</Text>
            <View style={styles.valueContainer}>
              <View style={styles.valueBox}>
                <Text style={styles.valueLabel}>Purchase Price</Text>
                <Text style={styles.valueAmount}>${item.purchase_price.toFixed(2)}</Text>
              </View>
              <View style={styles.valueBox}>
                <Text style={styles.valueLabel}>Current Value</Text>
                <Text style={[styles.valueAmount, styles.currentValue]}>
                  ${item.current_value.toFixed(2)}
                </Text>
              </View>
            </View>
            {item.purchase_price > 0 && item.current_value > 0 && (
              <View style={styles.profitContainer}>
                <Text style={styles.profitLabel}>Profit/Loss:</Text>
                <Text
                  style={[
                    styles.profitAmount,
                    item.current_value >= item.purchase_price
                      ? styles.profit
                      : styles.loss,
                  ]}
                >
                  ${(item.current_value - item.purchase_price).toFixed(2)}
                  {' ('}
                  {(((item.current_value - item.purchase_price) / item.purchase_price) * 100).toFixed(1)}
                  %)
                </Text>
              </View>
            )}
          </View>

          {item.barcode ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Barcode</Text>
              <Text style={styles.barcodeText}>{item.barcode}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 48,
    backgroundColor: '#1e293b',
  },
  backButton: {
    padding: 8,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
  },
  iconButton: {
    padding: 8,
  },
  scrollContainer: {
    paddingBottom: 32,
  },
  mainImage: {
    width: '100%',
    height: 300,
    backgroundColor: '#1e293b',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbnailActive: {
    borderColor: '#6366f1',
  },
  content: {
    padding: 16,
  },
  itemName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  conditionBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#312e81',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 24,
  },
  conditionText: {
    color: '#a5b4fc',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#cbd5e1',
    lineHeight: 24,
  },
  valueContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  valueBox: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  valueLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 4,
  },
  valueAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  currentValue: {
    color: '#10b981',
  },
  profitContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: '#1e293b',
    borderRadius: 8,
  },
  profitLabel: {
    fontSize: 14,
    color: '#9ca3af',
  },
  profitAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  profit: {
    color: '#10b981',
  },
  loss: {
    color: '#ef4444',
  },
  barcodeText: {
    fontSize: 16,
    color: '#cbd5e1',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 8,
  },
});