import { useCallback, useEffect, useState } from 'react';
import { newVoterId } from '../lib/ratings.js';

const VOTER_KEY = 'betterped:voterId';
const MINE_KEY = 'betterped:myRatings';

function readMine() {
  try {
    return JSON.parse(localStorage.getItem(MINE_KEY)) || {};
  } catch {
    return {};
  }
}

// Anonymous identity: lets a visitor change their own vote instead of adding
// another one. Clearing storage simply makes them a new voter.
function voterId() {
  try {
    let id = localStorage.getItem(VOTER_KEY);
    if (!id) {
      id = newVoterId();
      localStorage.setItem(VOTER_KEY, id);
    }
    return id;
  } catch {
    return newVoterId();
  }
}

// ratings: { [cupomId]: { n, atendimento, comida, ambiente } } from the API.
// mine: this visitor's own scores, kept locally to prefill the form.
export function useRatings(reloadKey) {
  const [ratings, setRatings] = useState({});
  const [mine, setMine] = useState(readMine);

  useEffect(() => {
    fetch('api/ratings', { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(setRatings)
      // ratings are optional: without the API the app just shows no stars
      .catch(() => {});
  }, [reloadKey]);

  const rate = useCallback(async (cupomId, scores) => {
    const res = await fetch(`api/ratings/${cupomId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voterId: voterId(), ...scores }),
    });
    if (!res.ok) {
      throw new Error(
        res.status === 429
          ? 'Você já enviou muitas avaliações hoje. Tente de novo amanhã.'
          : 'Não foi possível enviar sua avaliação. Tente de novo.',
      );
    }
    const agg = await res.json();
    setRatings((prev) => ({ ...prev, [cupomId]: agg }));
    setMine((prev) => {
      const next = { ...prev, [cupomId]: scores };
      try {
        localStorage.setItem(MINE_KEY, JSON.stringify(next));
      } catch {
        /* ignore quota / private-mode errors */
      }
      return next;
    });
  }, []);

  return { ratings, mine, rate };
}
