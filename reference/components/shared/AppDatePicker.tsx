import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AppDatePickerProps {
  value: string; // 'YYYY-MM-DD'
  onChange: (val: string) => void;
  label?: string;
}

const YEARS = Array.from({ length: 10 }, (_, i) => (new Date().getFullYear() - 2 + i).toString()); // Current year - 2 up to +7
const MONTHS = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));

const getDaysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();

const ITEM_HEIGHT = 52;
const VISIBLE_ITEMS = 3;
const LIST_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS; // 156
const PADDING = (LIST_HEIGHT - ITEM_HEIGHT) / 2; // 52

export default function AppDatePicker({ value, onChange, label }: AppDatePickerProps) {
  const [visible, setVisible] = useState(false);
  
  const initialDate = value ? new Date(value) : new Date();
  const safeDate = isNaN(initialDate.getTime()) ? new Date() : initialDate;

  const [selectedYear, setYear] = useState(safeDate.getFullYear().toString());
  const [selectedMonth, setMonth] = useState((safeDate.getMonth() + 1).toString().padStart(2, '0'));
  const [selectedDay, setDay] = useState(safeDate.getDate().toString().padStart(2, '0'));

  const yearRef = useRef<FlatList>(null);
  const monthRef = useRef<FlatList>(null);
  const dayRef = useRef<FlatList>(null);

  const daysInMonth = getDaysInMonth(parseInt(selectedYear), parseInt(selectedMonth));
  const DAYS = Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString().padStart(2, '0'));

  // Sync state on open
  useEffect(() => {
    if (visible && value) {
        const d = new Date(value);
        if (!isNaN(d.getTime())) {
            setYear(d.getFullYear().toString());
            setMonth((d.getMonth() + 1).toString().padStart(2, '0'));
            setDay(d.getDate().toString().padStart(2, '0'));
        }
    }
  }, [visible, value]);

  // Scroll to center on open
  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        const yIdx = YEARS.indexOf(selectedYear);
        if (yIdx >= 0) yearRef.current?.scrollToIndex({ index: yIdx, animated: false, viewPosition: 0.5 });
        
        const mIdx = MONTHS.indexOf(selectedMonth);
        if (mIdx >= 0) monthRef.current?.scrollToIndex({ index: mIdx, animated: false, viewPosition: 0.5 });

        // Ensure we don't try to scroll to a day index that's out of bounds if month changed
        const dIdx = DAYS.indexOf(selectedDay);
        if (dIdx >= 0) dayRef.current?.scrollToIndex({ index: dIdx, animated: false, viewPosition: 0.5 });
      }, 100);
    }
  }, [visible, selectedYear, selectedMonth, selectedDay]);

  const handleScroll = (event: any, type: 'year' | 'month' | 'day') => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    if (type === 'year') {
      if (index >= 0 && index < YEARS.length) setYear(YEARS[index]);
    } else if (type === 'month') {
      if (index >= 0 && index < MONTHS.length) setMonth(MONTHS[index]);
    } else {
      if (index >= 0 && index < DAYS.length) setDay(DAYS[index]);
    }
  };

  const handleSave = () => {
    let finalDay = selectedDay;
    if (parseInt(selectedDay) > daysInMonth) {
        finalDay = daysInMonth.toString().padStart(2, '0');
    }
    onChange(`${selectedYear}-${selectedMonth}-${finalDay}`);
    setVisible(false);
  };

  const currentDisplay = value || 'Select Date';

  const getItemLayout = (data: any, index: number) => (
    { length: ITEM_HEIGHT, offset: PADDING + ITEM_HEIGHT * index, index }
  );

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity style={styles.inputBtn} onPress={() => setVisible(true)}>
        <Text style={styles.inputText}>{currentDisplay}</Text>
        <Ionicons name="calendar-outline" size={18} color="#888" />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.pickerContainer}>
            <View style={styles.header}>
              <Text style={styles.title}>Select Date</Text>
              <TouchableOpacity onPress={() => setVisible(false)}>
                 <Ionicons name="close" size={24} color="#888" />
              </TouchableOpacity>
            </View>

            <View style={styles.wheelsContainer}>
              {/* Year */}
              <View style={styles.wheel}>
                <Text style={styles.wheelLabel}>Year</Text>
                <FlatList 
                  ref={yearRef}
                  style={{ height: LIST_HEIGHT, flexGrow: 0, width: '100%' }}
                  data={YEARS}
                  keyExtractor={item => item}
                  showsVerticalScrollIndicator={false}
                  getItemLayout={getItemLayout}
                  contentContainerStyle={{ paddingVertical: PADDING }}
                  snapToInterval={ITEM_HEIGHT}
                  snapToAlignment="center"
                  disableIntervalMomentum={true}
                  onScroll={(e) => handleScroll(e, 'year')}
                  scrollEventThrottle={16}
                  renderItem={({item}) => (
                    <View style={styles.wheelItem}>
                      <View style={[styles.wheelItemInner, selectedYear === item && styles.selectedWheelItem]}>
                        <Text style={[styles.wheelText, selectedYear === item && styles.selectedWheelText]}>{item}</Text>
                      </View>
                    </View>
                  )}
                />
              </View>

              {/* Month */}
              <View style={styles.wheel}>
                <Text style={styles.wheelLabel}>Month</Text>
                <FlatList 
                  ref={monthRef}
                  style={{ height: LIST_HEIGHT, flexGrow: 0, width: '100%' }}
                  data={MONTHS}
                  keyExtractor={item => item}
                  showsVerticalScrollIndicator={false}
                  getItemLayout={getItemLayout}
                  contentContainerStyle={{ paddingVertical: PADDING }}
                  snapToInterval={ITEM_HEIGHT}
                  snapToAlignment="center"
                  disableIntervalMomentum={true}
                  onScroll={(e) => handleScroll(e, 'month')}
                  scrollEventThrottle={16}
                  renderItem={({item}) => (
                    <View style={styles.wheelItem}>
                      <View style={[styles.wheelItemInner, selectedMonth === item && styles.selectedWheelItem]}>
                        <Text style={[styles.wheelText, selectedMonth === item && styles.selectedWheelText]}>{item}</Text>
                      </View>
                    </View>
                  )}
                />
              </View>

              {/* Day */}
              <View style={styles.wheel}>
                <Text style={styles.wheelLabel}>Day</Text>
                <FlatList 
                  ref={dayRef}
                  style={{ height: LIST_HEIGHT, flexGrow: 0, width: '100%' }}
                  data={DAYS}
                  keyExtractor={item => item}
                  showsVerticalScrollIndicator={false}
                  getItemLayout={getItemLayout}
                  contentContainerStyle={{ paddingVertical: PADDING }}
                  snapToInterval={ITEM_HEIGHT}
                  snapToAlignment="center"
                  disableIntervalMomentum={true}
                  onScroll={(e) => handleScroll(e, 'day')}
                  scrollEventThrottle={16}
                  renderItem={({item}) => (
                    <View style={styles.wheelItem}>
                      <View style={[styles.wheelItemInner, selectedDay === item && styles.selectedWheelItem]}>
                        <Text style={[styles.wheelText, selectedDay === item && styles.selectedWheelText]}>{item}</Text>
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
  container: { flex: 1, marginBottom: 16 },
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
  pickerContainer: { width: 340, backgroundColor: '#1A1A1A', borderRadius: 20, padding: 24, paddingBottom: 16, borderWidth: 1, borderColor: '#333' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  
  wheelsContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  wheel: { flex: 1, alignItems: 'center' },
  wheelLabel: { color: '#666', fontSize: 11, fontWeight: '700', marginBottom: 10, textTransform: 'uppercase' },
  
  wheelItem: { height: ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center', width: '100%' },
  wheelItemInner: { height: 44, width: '80%', justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  selectedWheelItem: { backgroundColor: '#332200' },
  
  wheelText: { color: '#888', fontSize: 18, fontWeight: '600' },
  selectedWheelText: { color: '#FFD700', fontWeight: '800' },

  saveBtn: { backgroundColor: '#FFD700', padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 24 },
  saveBtnText: { color: '#000', fontWeight: '800', fontSize: 16 }
});
