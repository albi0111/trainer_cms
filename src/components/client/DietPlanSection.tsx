// ─────────────────────────────────────────────────────────────────────────────
// DietPlanSection — Grid-based weekly meal planner with macros
// Reference: /reference/components/client/DietPlanSection.tsx
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import './DietPlanSection.css';
import Card from '../ui/Card';
import IconButton from '../ui/IconButton';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface DietMeal {
  name: string;
  foods: string;
}

interface DietPlan {
  id: string;
  client_id?: string;
  title: string;
  goal: string;
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fats_g?: number;
  meals?: DietMeal[];
}

interface DietPlanSectionProps {
  dietPlans: DietPlan[];
  isEditing?: boolean;
  onToggleEdit?: () => void;
  onSavePlan?: (planData: Partial<DietPlan>) => void;
}

export default function DietPlanSection({ dietPlans, isEditing, onToggleEdit, onSavePlan }: DietPlanSectionProps) {
  const [grid, setGrid] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>(['Meal 1']);
  const [macros, setMacros] = useState({
    calories: '',
    protein_g: '',
    carbs_g: '',
    fats_g: '',
  });

  // Sync with props when not editing
  useEffect(() => {
    if (isEditing) return;

    if (dietPlans.length > 0) {
      const plan = dietPlans[0]!;
      setMacros({
        calories: plan.calories?.toString() ?? '',
        protein_g: plan.protein_g?.toString() ?? '',
        carbs_g: plan.carbs_g?.toString() ?? '',
        fats_g: plan.fats_g?.toString() ?? '',
      });
      if (plan.meals && plan.meals.length > 0) {
        const loadedGrid = DAYS.map(() => ['']);
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

        const colsCount = loadedGrid[0]!.length;
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
  }, [dietPlans, isEditing]);

  const handleAddColumn = () => {
    setGrid(prev => prev.map(row => [...row, '']));
    setHeaders(prev => [...prev, `Meal ${prev.length + 1}`]);
  };

  const handleDeleteColumn = (cIdx: number) => {
    if (headers.length <= 1) return;
    setGrid(prev => prev.map(row => row.filter((_, i) => i !== cIdx)));
    setHeaders(prev => prev.filter((_, i) => i !== cIdx));
  };

  const handleCellChange = (rIdx: number, cIdx: number, val: string) => {
    setGrid(prev => {
      const newGrid = [...prev];
      newGrid[rIdx] = [...(newGrid[rIdx] ?? [])];
      newGrid[rIdx]![cIdx] = val;
      return newGrid;
    });
  };

  const handleHeaderChange = (cIdx: number, val: string) => {
    setHeaders(prev => {
      const newHeaders = [...prev];
      newHeaders[cIdx] = val;
      return newHeaders;
    });
  };

  const handleMacroChange = (key: keyof typeof macros, val: string) => {
    setMacros(prev => ({ ...prev, [key]: val }));
  };

  const handleSave = () => {
    if (!onSavePlan) return;
    const meals: DietMeal[] = [
      { name: 'headers', foods: JSON.stringify(headers) },
      ...DAYS.map((day, idx) => ({
        name: day,
        foods: JSON.stringify(grid[idx] ?? [])
      }))
    ];

    onSavePlan({
      meals,
      calories: macros.calories ? (parseFloat(macros.calories) || 0) : 0,
      protein_g: macros.protein_g ? (parseFloat(macros.protein_g) || 0) : 0,
      carbs_g: macros.carbs_g ? (parseFloat(macros.carbs_g) || 0) : 0,
      fats_g: macros.fats_g ? (parseFloat(macros.fats_g) || 0) : 0,
    });
  };

  const MACRO_CONFIG = [
    { key: 'calories', l: 'kcal', ul: 'CALORIES', c: '#FFE66D' },
    { key: 'protein_g', l: 'g', ul: 'PROTEIN', c: '#FF6B6B' },
    { key: 'carbs_g', l: 'g', ul: 'CARBS', c: '#4ECDC4' },
    { key: 'fats_g', l: 'g', ul: 'FAT', c: '#FFE66D' },
  ];

  return (
    <Card padding="md" className="diet-plan-section">
      <div className="card__header">
        <div className="card__header-left">
          <span className="card__header-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3DCC88" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
              <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>
              <line x1="6" y1="1" x2="6" y2="4"></line>
              <line x1="10" y1="1" x2="10" y2="4"></line>
              <line x1="14" y1="1" x2="14" y2="4"></line>
            </svg>
          </span>
          <span className="card__header-title">Diet Plan</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {isEditing ? (
            <>
              <IconButton
                icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>}
                onClick={handleAddColumn}
                label="Add Column"
              />
              <IconButton
                icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                onClick={handleSave}
                label="Save Changes"
                style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
              />
            </>
          ) : (
            <IconButton
              icon={<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M11.5 1.5L14.5 4.5L5 14H2V11L11.5 1.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
              onClick={onToggleEdit}
              label="Edit Diet Plan"
            />
          )}
        </div>
      </div>

      {/* Macros Section */}
      <div className="diet-macros-section">
        <div className="diet-macros-title">AVG DAILY INTAKE</div>
        <div className="diet-macro-row">
          {MACRO_CONFIG.map(m => (
            <div key={m.ul} className="diet-macro-box">
              {isEditing ? (
                <input
                  className="diet-macro-input"
                  style={{ color: m.c }}
                  value={(macros as any)[m.key]}
                  onChange={(e) => handleMacroChange(m.key as any, e.target.value)}
                  placeholder="—"
                  type="text"
                  inputMode="numeric"
                />
              ) : (
                <span className="diet-macro-input" style={{ color: m.c }}>{(macros as any)[m.key] || '—'}</span>
              )}
              <span className="diet-macro-unit">{m.l}</span>
              <span className="diet-macro-label">{m.ul}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="diet-grid-scroll">
        <div className="diet-grid-container">
          {/* Headers row (only if multiple columns) */}
          {headers.length > 1 && (
            <div className="diet-grid-row" style={{ marginBottom: 4 }}>
              <div className="diet-day-cell diet-day-cell--empty" />
              {headers.map((hdr, cIdx) => (
                <div key={`header-${cIdx}`} className="diet-header-cell" style={{ minWidth: headers.length > 2 ? 140 : 100 }}>
                  {isEditing ? (
                    <input
                      className="diet-header-input"
                      value={hdr}
                      onChange={(e) => handleHeaderChange(cIdx, e.target.value)}
                    />
                  ) : (
                    <span className="diet-header-input">{hdr}</span>
                  )}
                  {isEditing && (
                    <button className="diet-header-delete-btn" onClick={() => handleDeleteColumn(cIdx)}>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                        <path d="M2 4H14M5 4V2H11V4M6 7V12M10 7V12"></path>
                        <path d="M3 4L4 14H12L13 4"></path>
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Day rows */}
          {DAYS.map((day, rIdx) => (
            <div key={day} className="diet-grid-row">
              <div className="diet-day-cell">
                <span className="diet-day-text">{day}</span>
              </div>
              {grid[rIdx]?.map((cell, cIdx) => (
                isEditing ? (
                  <textarea
                    key={cIdx}
                    className="diet-input-cell"
                    style={{ minWidth: (grid[rIdx]?.length || 1) > 2 ? 140 : 100 }}
                    value={cell}
                    onChange={(e) => handleCellChange(rIdx, cIdx, e.target.value)}
                    placeholder="Enter meal..."
                  />
                ) : (
                  <div key={cIdx} className="diet-input-cell" style={{ minWidth: (grid[rIdx]?.length || 1) > 2 ? 140 : 100, whiteSpace: 'pre-wrap' }}>
                    {cell || <span style={{ color: '#555', fontStyle: 'italic' }}>No meal planned</span>}
                  </div>
                )
              ))}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
