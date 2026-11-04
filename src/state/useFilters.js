import { useReducer } from 'react';

function initialState() {
  return {
    search: '',
    subcats: new Set(),
    bairros: new Set(),
    caracts: new Set(),
    abertoAgora: false,
    activePresets: new Set(), // any of 'cafeManha' | 'almoco' | 'lanche' | 'jantar'
    customTime: null, // minutes since midnight | null
    selectedDays: new Set(), // 1..7; empty = no day filter
    favorito: false,
    visitado: false, // only places marked "Já fui" (or already rated)
    novidades: false, // only cupons added in the selected update
    minNota: null, // minimum overall score | null
    sort: 'nome', // 'nome' | 'nota' | 'bairro' | 'dist'
    userLat: null,
    userLng: null,
  };
}

// Toggle a value inside one of the Set-valued filters, returning a new Set
// so the reducer state identity changes.
function toggleSet(set, value) {
  const next = new Set(set);
  next.has(value) ? next.delete(value) : next.add(value);
  return next;
}

function reducer(state, action) {
  switch (action.type) {
    case 'set':
      return { ...state, [action.key]: action.value };
    case 'toggleSet':
      return { ...state, [action.key]: toggleSet(state[action.key], action.value) };
    case 'preset':
      // toggle membership; presets and custom time are mutually exclusive
      return {
        ...state,
        activePresets: toggleSet(state.activePresets, action.value),
        customTime: null,
      };
    case 'customTime':
      return { ...state, customTime: action.value, activePresets: new Set() };
    case 'clear': {
      const fresh = initialState();
      // keep geolocation + current sort so a clear doesn't drop the user's view
      return { ...fresh, sort: state.sort, userLat: state.userLat, userLng: state.userLng };
    }
    default:
      return state;
  }
}

export function useFilters() {
  const [filters, dispatch] = useReducer(reducer, undefined, initialState);
  return { filters, dispatch };
}
