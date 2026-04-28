import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Alert, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DietPlan, DietMeal } from '../../types';
import CardContainer from '../shared/CardContainer';
import EmptyState from '../shared/EmptyState';
import ConfirmationModal from '../modals/ConfirmationModal';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface DietPlanSectionProps {
  dietPlans: DietPlan[];
  onSavePlan?: (planData: Partial<DietPlan>) => void;
}

export default function DietPlanSection({ dietPlans, onSavePlan }: DietPlanSectionProps) {
  const [grid, setGrid] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>(['Meal 1']);
  const [hasChanges, setHasChanges] = useState(false);
  const [colToDelete, setColToDelete] = useState<number | null>(null);
  const [macros, setMacros] = useState({
    calories: '',
    protein_g: '',
    carbs_g: '',
    fats_g: '',
  });

  useEffect(() => {
    if (dietPlans.length > 0) {
      const plan = dietPlans[0];
      setMacros({
        calories: plan.calories?.toString() || '',
        protein_g: plan.protein_g?.toString() || '',
        carbs_g: plan.carbs_g?.toString() || '',
        fats_g: plan.fats_g?.toString() || '',
      });
      if (plan.meals && plan.meals.length > 0) {
        let loadedGrid = DAYS.map(() => ['']);
        let loadedHeaders = ['Meal 1'];
        let hasHeaders = false;

        plan.meals.forEach(m => {
          if (m.name === 'headers') {
            try { loadedHeaders = JSON.parse(m.foods); hasHeaders = true; } catch {}
          } else {
            const dayIdx = DAYS.indexOf(m.name);
            if (dayIdx !== -1) {
              try {
                const parsed = JSON.parse(m.foods);
                loadedGrid[dayIdx] = Array.isArray(parsed) ? parsed : [m.foods];
              } catch {
                loadedGrid[dayIdx] = [m.foods];
              }
            }
          }
        });

        const colsCount = loadedGrid[0].length;
        if (!hasHeaders || loadedHeaders.length !== colsCount) {
          loadedHeaders = Array.from({ length: colsCount }, (_, i) => `Meal ${i + 1}`);
        }

        setGrid(loadedGrid);
        setHeaders(loadedHeaders);
      } else {
        setGrid(DAYS.map(() => ['']));
        setHeaders(['Meal 1']);
      }
    } else {
      setGrid(DAYS.map(() => ['']));
      setHeaders(['Meal 1']);
      setMacros({ calories: '', protein_g: '', carbs_g: '', fats_g: '' });
    }
    setHasChanges(false);
  }, [dietPlans]);

  const handleAddColumn = () => {
    setGrid(prev => prev.map(row => [...row, '']));
    setHeaders(prev => [...prev, `Meal ${prev.length + 1}`]);
    setHasChanges(true);
  };

  const handleDeleteColumn = (cIdx: number) => {
    setColToDelete(cIdx);
  };

  const confirmDeleteColumn = () => {
    if (colToDelete !== null) {
      setGrid(prev => prev.map(row => row.filter((_, i) => i !== colToDelete)));
      setHeaders(prev => prev.filter((_, i) => i !== colToDelete));
      setHasChanges(true);
      setColToDelete(null);
    }
  };

  const handleCellChange = (rIdx: number, cIdx: number, val: string) => {
    setGrid(prev => {
      const newGrid = [...prev];
      newGrid[rIdx] = [...newGrid[rIdx]];
      newGrid[rIdx][cIdx] = val;
      return newGrid;
    });
    setHasChanges(true);
  };

  const handleHeaderChange = (cIdx: number, val: string) => {
    setHeaders(prev => {
      const newHeaders = [...prev];
      newHeaders[cIdx] = val;
      return newHeaders;
    });
    setHasChanges(true);
  };

  const handleMacroChange = (key: keyof typeof macros, val: string) => {
    setMacros(prev => ({ ...prev, [key]: val }));
    setHasChanges(true);
  };

  const handleSave = () => {
    if (!onSavePlan) return;
    const meals: DietMeal[] = [
      { name: 'headers', foods: JSON.stringify(headers) },
      ...DAYS.map((day, idx) => ({
        name: day,
        foods: JSON.stringify(grid[idx] || [])
      }))
    ];
    
    onSavePlan({
      meals,
      calories: macros.calories ? parseFloat(macros.calories) : undefined,
      protein_g: macros.protein_g ? parseFloat(macros.protein_g) : undefined,
      carbs_g: macros.carbs_g ? parseFloat(macros.carbs_g) : undefined,
      fats_g: macros.fats_g ? parseFloat(macros.fats_g) : undefined,
    });
    setHasChanges(false);
  };

  return (
    <>
    <CardContainer
      headerIcon="nutrition"
      headerIconColor="#3DCC88"
      headerTitle="Diet Plan"
      headerAddon={
        hasChanges ? (
          <TouchableOpacity onPress={handleSave} style={styles.headerSaveBtn}>
            <Ionicons name="checkmark-circle" size={18} color="#3DCC88" />
          </TouchableOpacity>
        ) : null
      }
      actionIcon="add-outline"
      actionLabel="Add Column"
      onAction={handleAddColumn}
    >
      <View style={styles.macrosSection}>
        <Text style={styles.macrosTitle}>AVG DAILY INTAKE</Text>
        <View style={styles.macroRow}>
          {[
            { key: 'calories', l: 'kcal', ul: 'CALORIES', c: '#FFE66D' },
            { key: 'protein_g', l: 'g', ul: 'PROTEIN', c: '#FF6B6B' },
            { key: 'carbs_g', l: 'g', ul: 'CARBS', c: '#4ECDC4' },
            { key: 'fats_g', l: 'g', ul: 'FAT', c: '#FFE66D' },
          ].map((m) => (
            <View key={m.ul} style={styles.macroBox}>
              <TextInput
                style={[styles.macroValInput, { color: m.c }]}
                value={(macros as any)[m.key]}
                onChangeText={(val) => handleMacroChange(m.key as any, val)}
                onBlur={handleSave}
                placeholder="—"
                placeholderTextColor="#666"
                keyboardType="numeric"
              />
              <Text style={styles.macroUnit}>{m.l}</Text>
              <Text style={styles.macroLabel}>{m.ul}</Text>
            </View>
          ))}
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16, flexGrow: 1 }}>
        <View style={[styles.gridContainer, { minWidth: '100%' }]}>
          {headers.length > 1 && (
            <View style={[styles.row, { marginBottom: 4 }]}>
              <View style={[styles.dayCell, { backgroundColor: 'transparent', borderColor: 'transparent', paddingVertical: 0 }]} />
              {headers.map((hdr, cIdx) => (
                <View key={`header-${cIdx}`} style={[styles.headerCell, { flex: 1, minWidth: headers.length > 2 ? 140 : 100 }]}>
                  <TextInput
                    style={styles.headerInput}
                    value={hdr}
                    onChangeText={(val) => handleHeaderChange(cIdx, val)}
                    onBlur={handleSave}
                  />
                  <TouchableOpacity onPress={() => handleDeleteColumn(cIdx)} style={styles.deleteColBtn}>
                    <Ionicons name="trash-outline" size={14} color="#FF5252" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {DAYS.map((day, rIdx) => (
            <View key={day} style={styles.row}>
              <View style={styles.dayCell}>
                <Text style={styles.dayText}>{day}</Text>
              </View>
              {grid[rIdx]?.map((cell, cIdx) => (
                <TextInput
                  key={cIdx}
                  style={[styles.inputCell, { flex: 1, minWidth: grid[rIdx].length > 2 ? 140 : 100 }]}
                  value={cell}
                  onChangeText={(val) => handleCellChange(rIdx, cIdx, val)}
                  onBlur={handleSave}
                  placeholder="Enter meal..."
                  placeholderTextColor="#555"
                  multiline
                />
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </CardContainer>
      <ConfirmationModal
        visible={colToDelete !== null}
        onClose={() => setColToDelete(null)}
        onConfirm={confirmDeleteColumn}
        title="Delete Column"
        message="Are you sure you want to delete this column? All meals in this column will be removed."
        confirmText="Delete"
        type="danger"
      />
    </>
  );
}

const styles = StyleSheet.create({
  headerSaveBtn: {
    marginLeft: 12,
  },
  macrosSection: {
    marginBottom: 16,
  },
  macrosTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#666',
    letterSpacing: 1,
    marginBottom: 10,
  },
  macroRow: { flexDirection: 'row', gap: 8 },
  macroBox: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  macroValInput: {
    fontSize: 24,
    fontWeight: '800',
    padding: 0,
    margin: 0,
    textAlign: 'center',
    width: '100%',
  },
  macroUnit: { fontSize: 11, color: '#888', fontWeight: '500', marginTop: 4 },
  macroLabel: { fontSize: 10, color: '#888', fontWeight: '700', marginTop: 2, letterSpacing: 0.5 },
  gridContainer: {
    flexDirection: 'column',
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
  },
  dayCell: {
    width: 60,
    backgroundColor: '#161616',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1F1F1F',
    paddingVertical: 12,
  },
  dayText: {
    color: '#3DCC88',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  inputCell: {
    backgroundColor: '#1A1A1A',
    color: '#FFF',
    fontSize: 13,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    minHeight: 50,
    textAlignVertical: 'top',
  },
  headerCell: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161616',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1F1F1F',
    paddingHorizontal: 8,
    minHeight: 36,
  },
  headerInput: {
    flex: 1,
    color: '#3DCC88',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    textAlign: 'center',
    paddingVertical: 4,
  },
  deleteColBtn: {
    padding: 4,
    marginLeft: 4,
  },
});
