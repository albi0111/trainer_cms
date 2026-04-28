import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/theme';

export type ConfirmationType = 'danger' | 'warning' | 'info' | 'success';

interface ConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: ConfirmationType;
  icon?: keyof typeof Ionicons.glyphMap;
}

export default function ConfirmationModal({
  visible,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger',
  icon,
}: ConfirmationModalProps) {
  const getTypeConfig = () => {
    switch (type) {
      case 'danger':
        return {
          color: colors.error,
          bg: 'rgba(255, 82, 82, 0.1)',
          border: 'rgba(255, 82, 82, 0.2)',
          defaultIcon: 'trash' as const,
        };
      case 'warning':
        return {
          color: colors.primary,
          bg: 'rgba(255, 215, 0, 0.1)',
          border: 'rgba(255, 215, 0, 0.2)',
          defaultIcon: 'alert-circle' as const,
        };
      case 'info':
        return {
          color: '#3498db',
          bg: 'rgba(52, 152, 219, 0.1)',
          border: 'rgba(52, 152, 219, 0.2)',
          defaultIcon: 'information-circle' as const,
        };
      case 'success':
        return {
          color: '#3DCC88',
          bg: 'rgba(61, 204, 136, 0.1)',
          border: 'rgba(61, 204, 136, 0.2)',
          defaultIcon: 'checkmark-circle' as const,
        };
      default:
        return {
          color: colors.primary,
          bg: 'rgba(255, 215, 0, 0.1)',
          border: 'rgba(255, 215, 0, 0.2)',
          defaultIcon: 'help-circle' as const,
        };
    }
  };

  const config = getTypeConfig();
  const activeIcon = icon || config.defaultIcon;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.iconContainer}>
            <View style={[styles.iconCircle, { backgroundColor: config.bg, borderColor: config.border }]}>
              <Ionicons name={activeIcon} size={32} color={config.color} />
            </View>
          </View>
          
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>{cancelText}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.confirmBtn, { backgroundColor: config.color }]} 
              onPress={onConfirm}
            >
              <Text style={styles.confirmBtnText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    backgroundColor: colors.background,
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderContainer,
  },
  iconContainer: {
    marginBottom: 20,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    color: colors.textLight,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  cancelBtnText: {
    color: colors.textLight,
    fontWeight: '700',
    fontSize: 15,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmBtnText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 15,
  },
});
