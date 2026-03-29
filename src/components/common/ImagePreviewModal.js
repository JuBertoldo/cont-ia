import React from 'react';
import { Modal, View, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ImagePreviewModal({ visible, imageUrl, onClose }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={onClose}
          activeOpacity={0.8}
        >
          <Ionicons name="close-circle" size={38} color="#FFF" />
        </TouchableOpacity>

        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} />
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  closeBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  image: {
    width: '100%',
    height: '70%',
    resizeMode: 'contain',
    borderRadius: 16,
  },
});