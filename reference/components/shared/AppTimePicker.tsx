import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AppTimePickerProps {
  value: string; // 'HH:MM'
  onChange: (val: string) => void;
  label?: string;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const MINUTES = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0')); // 00, 05, 10...

const ITEM_HEIGHT = 52;
const VISIBLE_ITEMS = 3;
const LIST_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS; // 156
const PADDING = (LIST_HEIGHT - ITEM_HEIGHT) / 2; // 52

export default function AppTimePicker({ value, onChange, label }: AppTimePickerProps) {
  const [visible, setVisible] = useState(false);
  
  const [selectedHour, setHour] = useState(value ? value.split(':')[0] : '05');
  const [selectedMinute, setMinute] = useState(value ? value.split(':')[1] : '00');

  const hourRef = useRef<FlatList>(null);
  const minuteRef = useRef<FlatList>(null);

  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        const hIdx = HOURS.indexOf(selectedHour);
        if (hIdx >= 0) hourRef.current?.scrollToIndex({ index: hIdx, animated: false, viewPosition: 0.5 });
        
        const mIdx = MINUTES.indexOf(selectedMinute);
        if (mIdx >= 0) minuteRef.current?.scrollToIndex({ index: mIdx, animated: false, viewPosition: 0.5 });
      }, 100);
    }
  }, [visible, selectedHour, selectedMinute]);

  const handleScroll = (event: any, type: 'hour' | 'minute') => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    if (type === 'hour') {
      if (index >= 0 && index < HOURS.length) setHour(HOURS[index]);
    } else {
      if (index >= 0 && index < MINUTES.length) setMinute(MINUTES[index]);
    }
  };

  const handleSave = () => {
    onChange(`${selectedHour}:${selectedMinute}`);
    setVisible(false);
  };

  const currentDisplay = value || 'Select Time';

  const getItemLayout = (data: any, index: number) => (
    { length: ITEM_HEIGHT, offset: PADDING + ITEM_HEIGHT * index, index }
  );

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
                  ref={hourRef}
                  style={{ height: LIST_HEIGHT, flexGrow: 0, width: '100%' }}
                  data={HOURS}
                  keyExtractor={item => item}
                  showsVerticalScrollIndicator={false}
                  getItemLayout={getItemLayout}
                  contentContainerStyle={{ paddingVertical: PADDING }}
                  snapToInterval={ITEM_HEIGHT}
                  snapToAlignment="center"
                  disableIntervalMomentum={true}
                  onScroll={(e) => handleScroll(e, 'hour')}
                  scrollEventThrottle={16}
                  renderItem={({item}) => (
                    <View style={styles.wheelItem}>
                      <View style={[styles.wheelItemInner, selectedHour === item && styles.selectedWheelItem]}>
                        <Text style={[styles.wheelText, selectedHour === item && styles.selectedWheelText]}>{item}</Text>
                      </View>
                    </View>
                  )}
                />
              </View>

              <Text style={styles.colon}>:</Text>

              {/* Minutes */}
              <View style={styles.wheel}>
                <Text style={styles.wheelLabel}>Minute</Text>
                <FlatList 
                  ref={minuteRef}
                  style={{ height: LIST_HEIGHT, flexGrow: 0, width: '100%' }}
                  data={MINUTES}
                  keyExtractor={item => item}
                  showsVerticalScrollIndicator={false}
                  getItemLayout={getItemLayout}
                  contentContainerStyle={{ paddingVertical: PADDING }}
                  snapToInterval={ITEM_HEIGHT}
                  snapToAlignment="center"
                  disableIntervalMomentum={true}
                  onScroll={(e) => handleScroll(e, 'minute')}
                  scrollEventThrottle={16}
                  renderItem={({item}) => (
                    <View style={styles.wheelItem}>
                      <View style={[styles.wheelItemInner, selectedMinute === item && styles.selectedWheelItem]}>
                        <Text style={[styles.wheelText, selectedMinute === item && styles.selectedWheelText]}>{item}</Text>
                      </View>
                    </View>
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
  
  wheelsContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  wheel: { width: 80, alignItems: 'center' },
  wheelLabel: { color: '#666', fontSize: 11, fontWeight: '700', marginBottom: 10, textTransform: 'uppercase' },
  
  wheelItem: { height: ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center', width: '100%' },
  wheelItemInner: { height: 44, width: '80%', justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  selectedWheelItem: { backgroundColor: '#332200' },
  
  wheelText: { color: '#888', fontSize: 20, fontWeight: '600' },
  selectedWheelText: { color: '#FFD700', fontWeight: '800' },
  colon: { color: '#666', fontSize: 24, fontWeight: '800', marginHorizontal: 10, marginTop: 24 },

  saveBtn: { backgroundColor: '#FFD700', padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 24 },
  saveBtnText: { color: '#000', fontWeight: '800', fontSize: 16 }
});
