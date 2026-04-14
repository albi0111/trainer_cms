import React, { useState, useEffect } from 'react';
import { X, Check, Plus, Trash2 } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useApp, DietPlan, Meal } from '../../context/AppContext';

interface DietPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
}

const inputStyle = (t: any) => ({
  width: '100%', padding: '10px 14px',
  background: t.bgInput, border: `1px solid ${t.border}`,
  borderRadius: '8px', color: t.text, fontSize: '14px',
  outline: 'none', boxSizing: 'border-box' as const,
  fontFamily: 'Inter, sans-serif',
});

const labelStyle = (t: any) => ({
  display: 'block', fontSize: '11px', fontWeight: 600,
  textTransform: 'uppercase' as const, letterSpacing: '0.5px',
  color: t.textMuted, marginBottom: '6px',
});

const macroInput = (t: any) => ({
  ...inputStyle(t), textAlign: 'center' as const,
});

export function DietPlanModal({ isOpen, onClose, clientId }: DietPlanModalProps) {
  const { t } = useTheme();
  const { getClient, updateDietPlan } = useApp();
  const client = getClient(clientId);

  const [plan, setPlan] = useState<DietPlan>({
    calories: 0, protein: 0, carbs: 0, fat: 0, meals: [], notes: '',
  });

  useEffect(() => {
    if (client && isOpen) {
      setPlan(JSON.parse(JSON.stringify(client.dietPlan)));
    }
  }, [client, isOpen]);

  if (!isOpen || !client) return null;

  const addMeal = () => {
    setPlan(p => ({ ...p, meals: [...p.meals, { name: '', description: '' }] }));
  };

  const updateMeal = (idx: number, field: keyof Meal, value: string) => {
    setPlan(p => ({ ...p, meals: p.meals.map((m, i) => i === idx ? { ...m, [field]: value } : m) }));
  };

  const removeMeal = (idx: number) => {
    setPlan(p => ({ ...p, meals: p.meals.filter((_, i) => i !== idx) }));
  };

  const handleSave = () => {
    updateDietPlan(clientId, plan);
    onClose();
  };

  const macros = [
    { label: 'Calories', key: 'calories' as keyof DietPlan, unit: 'kcal', color: t.accent },
    { label: 'Protein', key: 'protein' as keyof DietPlan, unit: 'g', color: '#FF6B6B' },
    { label: 'Carbs', key: 'carbs' as keyof DietPlan, unit: 'g', color: '#4ECDC4' },
    { label: 'Fat', key: 'fat' as keyof DietPlan, unit: 'g', color: '#FFE66D' },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: t.bgOverlay, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
      onClick={onClose}>
      <div style={{ background: t.bgCard, borderRadius: '20px', border: `1px solid ${t.border}`, boxShadow: `0 24px 64px ${t.shadow}`, width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '16px', fontWeight: 700, color: t.text }}>Edit Diet Plan</span>
          <button onClick={onClose} style={{ background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: t.textMuted }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Macros */}
          <div>
            <p style={{ fontSize: '11px', fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Daily Macros</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
              {macros.map(macro => (
                <div key={macro.key} style={{ textAlign: 'center' }}>
                  <div style={{ padding: '12px 8px', background: t.bgInput, borderRadius: '10px', border: `2px solid ${macro.color}22`, marginBottom: '6px' }}>
                    <input
                      style={{ ...macroInput(t), background: 'transparent', border: 'none', padding: '0', fontSize: '18px', fontWeight: 700, color: macro.color, width: '100%' }}
                      type="number"
                      value={plan[macro.key] as number || ''}
                      onChange={e => setPlan(p => ({ ...p, [macro.key]: parseInt(e.target.value) || 0 }))}
                    />
                    <span style={{ fontSize: '10px', color: t.textMuted }}>{macro.unit}</span>
                  </div>
                  <span style={{ fontSize: '10px', fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{macro.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Meals */}
          <div>
            <p style={{ fontSize: '11px', fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Meal Plan</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {plan.meals.map((meal, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <input
                      style={{ ...inputStyle(t), padding: '8px 12px', fontSize: '13px' }}
                      placeholder="Meal name (e.g. Breakfast 7am)"
                      value={meal.name}
                      onChange={e => updateMeal(idx, 'name', e.target.value)}
                    />
                    <textarea
                      style={{ ...inputStyle(t), padding: '8px 12px', fontSize: '13px', resize: 'vertical', minHeight: '52px' }}
                      placeholder="Foods and quantities..."
                      value={meal.description}
                      onChange={e => updateMeal(idx, 'description', e.target.value)}
                    />
                  </div>
                  <button onClick={() => removeMeal(idx)} style={{ width: '32px', height: '32px', borderRadius: '6px', border: `1px solid ${t.border}`, background: t.bgInput, color: t.danger, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, marginTop: '2px' }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              <button onClick={addMeal} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '8px', border: `1px dashed ${t.border}`, background: 'transparent', color: t.textMuted, cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                <Plus size={14} /> Add Meal
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={labelStyle(t)}>Notes & Supplements</label>
            <textarea style={{ ...inputStyle(t), minHeight: '72px', resize: 'vertical' }} placeholder="Additional notes, supplements, guidelines..." value={plan.notes} onChange={e => setPlan(p => ({ ...p, notes: e.target.value }))} />
          </div>
        </div>

        <div style={{ padding: '0 24px 24px', display: 'flex', gap: '12px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: `1px solid ${t.border}`, background: t.bgInput, color: t.text, cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>
            Cancel
          </button>
          <button onClick={handleSave} style={{ flex: 2, padding: '12px', borderRadius: '10px', background: t.accent, color: t.accentFg, border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <Check size={16} /> Save Diet Plan
          </button>
        </div>
      </div>
    </div>
  );
}
