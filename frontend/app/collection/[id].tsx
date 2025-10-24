import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Image, Alert, Share } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

interface Collection {
  id: string;
  name: string;
  category: string;
  description: string;
  item_count: number;
}

interface Item {
  id: string;
  name: string;
  images: string[];
  condition: string;
  current_value: number;
}

export default function CollectionDetailScreen() {
  const { id } = useLocalSearchParams();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchCollectionDetails();
  }, [id]);

  const fetchCollectionDetails = async () => {
    try {
      const [collectionRes, itemsRes] = await Promise.all([
        api.get(`/collections/${id}`),
        api.get(`/items/collection/${id}`),
      ]);
      setCollection(collectionRes.data);
      setItems(itemsRes.data);
    } catch (error) {
      console.error('Error fetching collection:', error);
      Alert.alert('Error', 'Failed to load collection');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      const response = await api.post(`/share/collection/${id}`);
      const shareCode = response.data.share_code;
      await Share.share({
        message: `Check out my ${collection?.name} collection! Use code: ${shareCode}`,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to generate share code');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Collection',
      'Are you sure? This will delete all items in this collection.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/collections/${id}`);
              Alert.alert('Success', 'Collection deleted');
              router.back();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete collection');
            }
          },
        },
      ]
    );
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
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
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
          <TouchableOpacity onPress={handleShare} style={styles.iconButton}>
            <Ionicons name="share-outline" size={24} color="#ffffff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.iconButton}>
            <Ionicons name="trash-outline" size={24} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.collectionHeader}>
        <Text style={styles.collectionName}>{collection?.name}</Text>
        <Text style={styles.collectionCategory}>{collection?.category}</Text>
        {collection?.description ? (
          <Text style={styles.collectionDescription}>{collection.description}</Text>
        ) : null}
        <Text style={styles.itemCount}>{items.length} items</Text>
      </View>

      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={64} color="#475569" />
            <Text style={styles.emptyText}>No items in this collection</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push(`/item/add?collectionId=${id}`)}
            >
              <Text style={styles.addButtonText}>Add Item</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push(`/item/add?collectionId=${id}`)}
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
  collectionHeader: {
    padding: 16,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  collectionName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  collectionCategory: {
    fontSize: 14,
    color: '#6366f1',
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 8,
  },
  collectionDescription: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 8,
  },
  itemCount: {
    fontSize: 12,
    color: '#64748b',
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
    marginBottom: 24,
  },
  addButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
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