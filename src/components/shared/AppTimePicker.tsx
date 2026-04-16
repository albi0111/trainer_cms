import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AppTimePickerProps {
  value: string; // 'HH:MM'
  onChange: (val: string) => void;
  label?: string;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const MINUTES = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0')); // 00, 05, 10...

export default function AppTimePicker({ value, onChange, label }: AppTimePickerProps) {
  const [visible, setVisible] = useState(false);
  
  const [selectedHour, setHour] = useState(value ? value.split(':')[0] : '05');
  const [selectedMinute, setMinute] = useState(value ? value.split(':')[1] : '00');

  const handleSave = () => {
    onChange(`${selectedHour}:${selectedMinute}`);
    setVisible(false);
  };

  const currentDisplay = value || 'Select Time';

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity style={styles.inputBtn} onPress={() => setVisible(true)}>
        <Text style={styles.inputText}>{currentDisplay}</Text>
        <Ionicons name="time-outline" size={18} color="#888" />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.pickerContainer}>
            <View style={styles.header}>
              <Text style={styles.title}>Select Time</Text>
              <TouchableOpacity onPress={() => setVisible(false)}>
                 <Ionicons name="close" size={24} color="#888" />
              </TouchableOpacity>
            </View>

            <View style={styles.wheelsContainer}>
              {/* Hours */}
              <View style={styles.wheel}>
                <Text style={styles.wheelLabel}>Hour</Text>
                <FlatList 
                  data={HOURS}
                  keyExtractor={item => item}
                  showsVerticalScrollIndicator={false}
                  renderItem={({item}) => (
                    <TouchableOpacity 
                       style={[styles.wheelItem, selectedHour === item && styles.selectedWheelItem]}
                       onPress={() => setHour(item)}
                    >
                      <Text style={[styles.wheelText, selectedHour === item && styles.selectedWheelText]}>{item}</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>

              <Text style={styles.colon}>:</Text>

              {/* Minutes */}
              <View style={styles.wheel}>
                <Text style={styles.wheelLabel}>Minute</Text>
                <FlatList 
                  data={MINUTES}
                  keyExtractor={item => item}
                  showsVerticalScrollIndicator={false}
                  renderItem={({item}) => (
                    <TouchableOpacity 
                       style={[styles.wheelItem, selectedMinute === item && styles.selectedWheelItem]}
                       onPress={() => setMinute(item)}
                    >
                      <Text style={[styles.wheelText, selectedMinute === item && styles.selectedWheelText]}>{item}</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  label: { color: '#888', fontSize: 12, fontWeight: '600', marginBottom: 6 },
  inputBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    backgroundColor: '#222', 
    borderRadius: 12, 
    padding: 14, 
    borderWidth: 1, 
    borderColor: '#333' 
  },
  inputText: { color: '#FFF', fontSize: 16 },
  
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  pickerContainer: { width: 300, backgroundColor: '#1A1A1A', borderRadius: 20, padding: 24, paddingBottom: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  
  wheelsContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', height: 200 },
  wheel: { width: 80, height: '100%', alignItems: 'center' },
  wheelLabel: { color: '#666', fontSize: 11, fontWeight: '700', marginBottom: 10, textTransform: 'uppercase' },
  wheelItem: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, marginVertical: 2 },
  selectedWheelItem: { backgroundColor: '#332200' },
  wheelText: { color: '#888', fontSize: 20, fontWeight: '600' },
  selectedWheelText: { color: '#FFD700', fontWeight: '800' },
  colon: { color: '#666', fontSize: 24, fontWeight: '800', marginHorizontal: 10, marginTop: 24 },

  saveBtn: { backgroundColor: '#FFD700', padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 24 },
  saveBtnText: { color: '#000', fontWeight: '800', fontSize: 16 }
});
