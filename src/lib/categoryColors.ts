// Single source for category color -> both the pie chart (Cell fill) and
// the per-row category dot read from this map, so a category is never two
// colors in two places. Generated in OKLCH at constant L=0.72 C=0.11 (see
// design notes) so all twelve read as one family regardless of hue -
// distinct from HSL, which would make yellows look far lighter than blues
// at the same nominal "lightness". Hues are kept clear of the reserved
// --positive/--negative/--warning/--accent tokens used for status states.
export const CATEGORY_COLORS: Record<string, string> = {
  Income: '#b493dd',
  'Food & Drink': '#de879d',
  Shopping: '#e18a76',
  Entertainment: '#d59557',
  Transport: '#bba34d',
  Groceries: '#96b061',
  Utilities: '#69b985',
  Rent: '#3ebbac',
  Travel: '#3cb6ce',
  Bills: '#64ace4',
  Services: '#8f9fea',
  Other: '#cf8ac1',
};

const FALLBACK_COLOR = '#9aa3a8';

export function categoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? FALLBACK_COLOR;
}
