import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';

interface Item {
  id: string;
  name: string;
  description: string;
  images: string[];
  condition: string;
  current_value: number;
  asking_price?: number;
}

export default function SellingScreen() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const { token } = useAuthStore();

  useEffect(() => {
    if (!token) {
      router.replace('/');
      return;
    }
    fetchSellingItems();
  }, [token]);

  const fetchSellingItems = async () => {
    try {
      const response = await api.get('/items/status/selling');
      setItems(response.data);
    } catch (error) {
      console.error('Error fetching selling items:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchSellingItems();
  };

  const renderItem = ({ item }: { item: Item }) => (
    <TouchableOpacity
      style={styles.itemCard}
      onPress={() => router.push(`/item/${item.id}`)}
    >
      {item.images && item.images.length > 0 ? (
        <Image
          source={{ uri: item.images[0] }}
          style={styles.itemImage}
        />
      ) : (
        <View style={[styles.itemImage, styles.placeholderImage]}>
          <Ionicons name="image-outline" size={32} color="#64748b" />
        </View>
      )}
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.itemCondition}>{item.condition}</Text>
        {item.asking_price && item.asking_price > 0 ? (
          <Text style={styles.itemPrice}>${item.asking_price.toFixed(2)}</Text>
        ) : (
          <Text style={styles.itemPrice}>Price TBD</Text>
        )}
      </View>
      <View style={styles.sellingBadge}>
        <Ionicons name="pricetag" size={16} color="#10b981" />
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="pricetag-outline" size={64} color="#475569" />
            <Text style={styles.emptyText}>No items for sale</Text>
            <Text style={styles.emptySubtext}>Mark items as 'selling' to see them here</Text>
          </View>
        }
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/item/add')}
      >
        <Ionicons name="add" size={32} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    paddingBottom: 60,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  listContainer: {
    padding: 8,
    paddingBottom: 100,
  },
  itemCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    margin: 8,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
    position: 'relative',
  },
  itemImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#334155',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: {
    padding: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  itemCondition: {
    fontSize: 12,
    color: '#9ca3af',
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  sellingBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#064e3b',
    borderRadius: 16,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: 18,
    marginTop: 16,
  },
  emptySubtext: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 80,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});