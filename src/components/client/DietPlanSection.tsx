import React from 'react';
import { StyleSheet, Text, View, Alert, TouchableOpacity } from 'react-native';
import { DietPlan } from '../../types';
import CardContainer from '../shared/CardContainer';
import EmptyState from '../shared/EmptyState';

interface DietPlanSectionProps {
  dietPlans: DietPlan[];
}

export default function DietPlanSection({ dietPlans }: DietPlanSectionProps) {
  return (
    <CardContainer
      headerIcon="nutrition"
      headerIconColor="#3DCC88"
      headerTitle="Diet Plan"
      actionIcon="pencil"
      actionLabel="Edit Plan"
      onAction={() => Alert.alert('Edit Plan', 'Diet Plan editor modal features coming soon.')}
    >
      {dietPlans.length === 0 ? (
        <EmptyState message="No diet plan active." />
      ) : (
        <View>
          <View style={styles.macroRow}>
            {[
              { v: dietPlans[0].calories, l: 'kcal', ul: 'CALORIES', c: '#FFF' },
              { v: dietPlans[0].protein_g, l: 'g', ul: 'PROTEIN', c: '#FF5252' },
              { v: dietPlans[0].carbs_g, l: 'g', ul: 'CARBS', c: '#3DCC88' },
              { v: dietPlans[0].fats_g, l: 'g', ul: 'FAT', c: '#FFD700' },
            ].map((m) => (
              <View key={m.ul} style={styles.macroBox}>
                <Text style={[styles.macroVal, { color: m.c }]}>
                  {m.v || '—'} <Text style={styles.macroUnit}>{m.l}</Text>
                </Text>
                <Text style={styles.macroLabel}>{m.ul}</Text>
              </View>
            ))}
          </View>
          {(dietPlans[0].meals || []).length > 0 ? (
            dietPlans[0].meals!.map((meal, idx) => (
              <View key={idx} style={styles.mealItem}>
                <Text style={styles.mealName}>{meal.name}</Text>
                <Text style={styles.mealFoods}>{meal.foods}</Text>
              </View>
            ))
          ) : (
            <View style={styles.mealItem}>
              <Text style={styles.mealName}>Notes / Guidelines</Text>
              <Text style={styles.mealFoods}>
                {dietPlans[0].meal_notes || 'No specific meals detailed.'}
              </Text>
            </View>
          )}
        </View>
      )}
    </CardContainer>
  );
}

const styles = StyleSheet.create({
  macroRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  macroBox: {
    flex: 1,
    backgroundColor: '#161616',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  macroVal: { fontSize: 16, fontWeight: '800' },
  macroUnit: { fontSize: 10, color: '#AAA', fontWeight: '600' },
  macroLabel: { fontSize: 9, color: '#666', fontWeight: '800', marginTop: 6 },
  mealItem: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    backgroundColor: '#161616',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  mealName: { color: '#3DCC88', fontSize: 13, fontWeight: '700', marginBottom: 6 },
  mealFoods: { color: '#CCC', fontSize: 13, lineHeight: 20 },
});
