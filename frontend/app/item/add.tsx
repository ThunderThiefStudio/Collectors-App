import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert, Image } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';
import api from '../../services/api';

const CONDITIONS = ['mint', 'near_mint', 'excellent', 'good', 'fair', 'poor'];

export default function AddItemScreen() {
  const { collectionId } = useLocalSearchParams();
  const [collections, setCollections] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState(collectionId as string || '');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [condition, setCondition] = useState('good');
  const [isWishlist, setIsWishlist] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [barcode, setBarcode] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchCollections();
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    await ImagePicker.requestMediaLibraryPermissionsAsync();
    await ImagePicker.requestCameraPermissionsAsync();
  };

  const fetchCollections = async () => {
    try {
      const response = await api.get('/collections');
      setCollections(response.data);
    } catch (error) {
      console.error('Error fetching collections:', error);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setImages([...images, `data:image/jpeg;base64,${result.assets[0].base64}`]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const takePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setImages([...images, `data:image/jpeg;base64,${result.assets[0].base64}`]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleCreate = async () => {
    if (!name) {
      Alert.alert('Error', 'Please enter item name');
      return;
    }

    setLoading(true);
    try {
      await api.post('/items', {
        collection_id: selectedCollection || null,
        name,
        description,
        images,
        barcode,
        purchase_price: parseFloat(purchasePrice) || 0,
        current_value: parseFloat(currentValue) || 0,
        condition,
        is_wishlist: isWishlist,
      });
      Alert.alert('Success', 'Item added successfully');
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to add item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.title}>Add Item</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Photos</Text>
          <View style={styles.imageContainer}>
            {images.map((image, index) => (
              <View key={index} style={styles.imageWrapper}>
                <Image source={{ uri: image }} style={styles.image} />
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeImage(index)}
                >
                  <Ionicons name="close-circle" size={24} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))}
            {images.length < 5 && (
              <>
                <TouchableOpacity style={styles.addImageButton} onPress={takePhoto}>
                  <Ionicons name="camera" size={32} color="#9ca3af" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.addImageButton} onPress={pickImage}>
                  <Ionicons name="images" size={32} color="#9ca3af" />
                </TouchableOpacity>
              </>
            )}
          </View>

          <Text style={styles.label}>Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Item name"
            placeholderTextColor="#64748b"
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.label}>Collection</Text>
          <View style={styles.collectionContainer}>
            <TouchableOpacity
              style={[
                styles.collectionButton,
                !selectedCollection && styles.collectionButtonSelected,
              ]}
              onPress={() => setSelectedCollection('')}
            >
              <Text
                style={[
                  styles.collectionText,
                  !selectedCollection && styles.collectionTextSelected,
                ]}
              >
                None
              </Text>
            </TouchableOpacity>
            {collections.map((coll: any) => (
              <TouchableOpacity
                key={coll.id}
                style={[
                  styles.collectionButton,
                  selectedCollection === coll.id && styles.collectionButtonSelected,
                ]}
                onPress={() => setSelectedCollection(coll.id)}
              >
                <Text
                  style={[
                    styles.collectionText,
                    selectedCollection === coll.id && styles.collectionTextSelected,
                  ]}
                >
                  {coll.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Add description..."
            placeholderTextColor="#64748b"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />

          <Text style={styles.label}>Barcode</Text>
          <View style={styles.barcodeContainer}>
            <TextInput
              style={[styles.input, styles.barcodeInput]}
              placeholder="Scan or enter barcode"
              placeholderTextColor="#64748b"
              value={barcode}
              onChangeText={setBarcode}
            />
            <TouchableOpacity
              style={styles.scanButton}
              onPress={() => router.push('/scan')}
            >
              <Ionicons name="barcode-outline" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Condition</Text>
          <View style={styles.conditionContainer}>
            {CONDITIONS.map((cond) => (
              <TouchableOpacity
                key={cond}
                style={[
                  styles.conditionButton,
                  condition === cond && styles.conditionButtonSelected,
                ]}
                onPress={() => setCondition(cond)}
              >
                <Text
                  style={[
                    styles.conditionText,
                    condition === cond && styles.conditionTextSelected,
                  ]}
                >
                  {cond.replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Text style={styles.label}>Purchase Price</Text>
              <TextInput
                style={styles.input}
                placeholder="$0.00"
                placeholderTextColor="#64748b"
                value={purchasePrice}
                onChangeText={setPurchasePrice}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.halfWidth}>
              <Text style={styles.label}>Current Value</Text>
              <TextInput
                style={styles.input}
                placeholder="$0.00"
                placeholderTextColor="#64748b"
                value={currentValue}
                onChangeText={setCurrentValue}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.wishlistToggle}
            onPress={() => setIsWishlist(!isWishlist)}
          >
            <Ionicons
              name={isWishlist ? 'heart' : 'heart-outline'}
              size={24}
              color={isWishlist ? '#ef4444' : '#9ca3af'}
            />
            <Text style={styles.wishlistText}>Add to Wishlist</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleCreate}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Adding...' : 'Add Item'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  form: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    color: '#ffffff',
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  imageContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 8,
  },
  imageWrapper: {
    position: 'relative',
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 12,
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
  },
  addImageButton: {
    width: 100,
    height: 100,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#334155',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  collectionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 8,
  },
  collectionButton: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  collectionButtonSelected: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  collectionText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  collectionTextSelected: {
    color: '#ffffff',
    fontWeight: '600',
  },
  barcodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  barcodeInput: {
    flex: 1,
    marginBottom: 0,
  },
  scanButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  conditionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 8,
  },
  conditionButton: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  conditionButtonSelected: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  conditionText: {
    color: '#9ca3af',
    fontSize: 14,
    textTransform: 'capitalize',
  },
  conditionTextSelected: {
    color: '#ffffff',
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  halfWidth: {
    flex: 1,
  },
  wishlistToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  wishlistText: {
    color: '#ffffff',
    fontSize: 16,
    marginLeft: 12,
  },
  button: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});