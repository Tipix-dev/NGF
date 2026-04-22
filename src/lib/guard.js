export function guardAction(action, type, value, ctx) {
  const history = ctx.history || [];

  const lastAction = [...history]
    .reverse()
    .find(h => h.type === type && h.value === value);

  // CASE 1: block → follow
  if (action === "follow" && lastAction?.action === "block") {
    return {
      warn: true,
      message: `You previously BLOCKED ${value}. Are you sure you want to FOLLOW it?`
    };
  }

  // CASE 2: follow → block
  if (action === "block" && lastAction?.action === "follow") {
    return {
      warn: true,
      message: `You previously FOLLOWED ${value}. Are you sure you want to BLOCK it?`
    };
  }

  // CASE 3: re-add after remove
  if (action === "follow" || action === "block") {
    const wasRemoved = history.find(
      h => h.action === "rm" && h.value === value
    );

    if (wasRemoved) {
      return {
        warn: true,
        message: `You previously REMOVED ${value}. Are you sure you want to re-add it?`
      };
    }
  }

  return { warn: false };
}