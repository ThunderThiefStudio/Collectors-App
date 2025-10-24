import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

const CATEGORIES = [
  'video games',
  't-shirts',
  'shoes',
  'crystals',
  'trading cards',
  'dolls',
  'action figures',
  'other',
];

export default function AddCollectionScreen() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCreate = async () => {
    if (!name || !selectedCategory) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      await api.post('/collections', {
        name,
        category: selectedCategory,
        description,
      });
      Alert.alert('Success', 'Collection created successfully');
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create collection');
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
          <Text style={styles.title}>New Collection</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="My Collection"
            placeholderTextColor="#64748b"
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.label}>Category *</Text>
          <View style={styles.categoryContainer}>
            {CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryButton,
                  selectedCategory === category && styles.categoryButtonSelected,
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text
                  style={[
                    styles.categoryText,
                    selectedCategory === category && styles.categoryTextSelected,
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Add a description..."
            placeholderTextColor="#64748b"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleCreate}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Creating...' : 'Create Collection'}</Text>
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
    height: 100,
    textAlignVertical: 'top',
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 8,
  },
  categoryButton: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  categoryButtonSelected: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  categoryText: {
    color: '#9ca3af',
    fontSize: 14,
    textTransform: 'capitalize',
  },
  categoryTextSelected: {
    color: '#ffffff',
    fontWeight: '600',
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