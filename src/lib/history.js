export function getLastAction(ctx, type, value) {
  return (ctx.history || [])
    .slice()
    .reverse()
    .find(h => h.type === type && h.value === value);
}