/**
 * Helpers for matching booking service categories against a technician's
 * skills / service categories (supports multiple skills per technician).
 */

export function normalizeSkill(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

export function buildSkillPool(...lists) {
  const pool = [];
  for (const list of lists) {
    if (!list) continue;
    if (Array.isArray(list)) {
      for (const item of list) {
        const normalized = normalizeSkill(item);
        if (normalized) pool.push(normalized);
      }
      continue;
    }
    const normalized = normalizeSkill(list);
    if (normalized) pool.push(normalized);
  }
  return [...new Set(pool)];
}

/**
 * True when the technician has the required skill among any of their skills.
 * Uses exact match first, then contains match for minor naming differences.
 */
export function technicianHasSkill(skillPool, requiredSkill) {
  const need = normalizeSkill(requiredSkill);
  if (!need) return true;

  const pool = Array.isArray(skillPool)
    ? skillPool.map(normalizeSkill).filter(Boolean)
    : buildSkillPool(skillPool);

  if (!pool.length) return false;
  if (pool.includes(need)) return true;

  return pool.some(
    (skill) =>
      skill === need ||
      (need.length >= 3 && skill.includes(need)) ||
      (skill.length >= 3 && need.includes(skill))
  );
}

export default {
  normalizeSkill,
  buildSkillPool,
  technicianHasSkill,
};
