import { useState, useEffect } from 'react';
import './DietPlanSection.css';
import Card from '../ui/Card';
import IconButton from '../ui/IconButton';
import LongPressCard from '../LongPressCard';

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

type MacroKey = 'calories' | 'protein_g' | 'carbs_g' | 'fats_g';

type DietMacros = Record<MacroKey, string>;

const DEFAULT_MACROS: DietMacros = {
  calories: '',
  protein_g: '',
  carbs_g: '',
  fats_g: '',
};

const MACRO_CONFIG: Array<{ key: MacroKey; l: string; ul: string; c: string }> = [
  { key: 'calories', l: 'kcal', ul: 'CALORIES', c: '#FFE66D' },
  { key: 'protein_g', l: 'g', ul: 'PROTEIN', c: '#FF6B6B' },
  { key: 'carbs_g', l: 'g', ul: 'CARBS', c: '#4ECDC4' },
  { key: 'fats_g', l: 'g', ul: 'FAT', c: '#FFE66D' },
];

function createEmptyGrid() {
  return DAYS.map(() => ['']);
}

function buildDietState(plan?: DietPlan) {
  if (!plan) {
    return {
      grid: createEmptyGrid(),
      headers: ['Meal 1'],
      macros: { ...DEFAULT_MACROS },
    };
  }

  const macros: DietMacros = {
    calories: plan.calories?.toString() ?? '',
    protein_g: plan.protein_g?.toString() ?? '',
    carbs_g: plan.carbs_g?.toString() ?? '',
    fats_g: plan.fats_g?.toString() ?? '',
  };

  if (!plan.meals?.length) {
    return {
      grid: createEmptyGrid(),
      headers: ['Meal 1'],
      macros,
    };
  }

  const grid = createEmptyGrid();
  let headers = ['Meal 1'];
  let hasHeaders = false;

  plan.meals.forEach((meal) => {
    if (meal.name === 'headers') {
      try {
        headers = JSON.parse(meal.foods) as string[];
        hasHeaders = true;
      } catch {
        headers = ['Meal 1'];
      }
      return;
    }

    const dayIndex = DAYS.indexOf(meal.name);
    if (dayIndex === -1) {
      return;
    }

    try {
      const parsed = JSON.parse(meal.foods) as string[] | string;
      grid[dayIndex] = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      grid[dayIndex] = [meal.foods];
    }
  });

  const columnCount = grid[0]?.length ?? 1;
  if (!hasHeaders || headers.length !== columnCount) {
    headers = Array.from({ length: columnCount }, (_, index) => `Meal ${index + 1}`);
  }

  return { grid, headers, macros };
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
  const [macros, setMacros] = useState<DietMacros>(DEFAULT_MACROS);

  useEffect(() => {
    if (isEditing) {
      return;
    }

    const { grid: nextGrid, headers: nextHeaders, macros: nextMacros } = buildDietState(dietPlans[0]);
    setGrid(nextGrid);
    setHeaders(nextHeaders);
    setMacros(nextMacros);
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

  const handleMacroChange = (key: MacroKey, val: string) => {
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

  const hasWideColumns = headers.length > 2;
  const hasSingleColumn = headers.length === 1;

  const content = (
    <>
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
        <div className="diet-plan-section__actions">
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
                className="diet-plan-section__save-btn"
              />
            </>
          ) : null}
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
                  value={macros[m.key]}
                  onChange={(e) => handleMacroChange(m.key, e.target.value)}
                  placeholder="—"
                  type="text"
                  inputMode="numeric"
                />
              ) : (
                <span className="diet-macro-input" style={{ color: m.c }}>{macros[m.key] || '—'}</span>
              )}
              <span className="diet-macro-unit">{m.l}</span>
              <span className="diet-macro-label">{m.ul}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="diet-grid-scroll">
        <div
          className={`diet-grid-container ${hasWideColumns ? 'diet-grid-container--wide' : ''} ${hasSingleColumn ? 'diet-grid-container--single-column' : ''}`.trim()}
        >
          {/* Headers row (only if multiple columns) */}
          {headers.length > 1 && (
            <div className="diet-grid-row diet-grid-row--header">
              <div className="diet-day-cell diet-day-cell--empty" />
              {headers.map((hdr, cIdx) => (
                <div key={`header-${cIdx}`} className="diet-header-cell">
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
                    value={cell}
                    onChange={(e) => handleCellChange(rIdx, cIdx, e.target.value)}
                    placeholder="Enter meal..."
                  />
                ) : (
                  <div key={cIdx} className="diet-input-cell diet-input-cell--readonly">
                    {cell}
                  </div>
                )
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );

  if (isEditing) {
    return (
      <Card padding="md" className="diet-plan-section">
        {content}
      </Card>
    );
  }

  if (!onToggleEdit) {
    return (
      <Card padding="md" className="diet-plan-section">
        {content}
      </Card>
    );
  }

  return (
    <LongPressCard onLongPress={onToggleEdit} className="card card--pad-md diet-plan-section">
      {content}
    </LongPressCard>
  );
}
