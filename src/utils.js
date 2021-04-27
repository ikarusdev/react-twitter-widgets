import loadjs from "loadjs";
import { useRef } from "react";

const twScriptUrl = "https://platform.twitter.com/widgets.js";
const twScriptWindowFieldName = "twttr";
const twScriptName = twScriptWindowFieldName;

export const canUseDOM = !!(
  typeof window !== "undefined" &&
  window.document &&
  window.document.createElement
);

export function twLoad() {
  loadjs(twScriptUrl, twScriptName);
}

export function twWidgetFactory() {
  return new Promise((resolve, reject) => {
    const rejectWithError = () =>
      reject(new Error("Could not load remote twitter widgets js"));
    loadjs.ready(twScriptName, {
      success: () => {
        // Ensure loaded
        const twttr = window[twScriptWindowFieldName];
        if (!twttr || !twttr.widgets) {
          rejectWithError();
        }
        resolve(twttr.widgets);
      },
      error: rejectWithError
    });
  });
}

export function twEventsFactory() {
  return new Promise((resolve, reject) => {
    const rejectWithError = () =>
      reject(new Error("Could not load remote twitter widgets js"));
    loadjs.ready(twScriptName, {
      success: () => {
        // Ensure loaded
        const twttr = window[twScriptWindowFieldName];
        if (!twttr || !twttr.widgets) {
          rejectWithError();
        }
        resolve(twttr.events);
      },
      error: rejectWithError
    });
  });
}

export function removeChildrenWithAttribute(node, attribute) {
  if (node) {
    node.querySelectorAll("*").forEach(child => {
      if (child.hasAttribute(attribute)) {
        child.remove();
      }
    });
  }
}

function is(x, y) {
  if (x === y) {
    return x !== 0 || y !== 0 || 1 / x === 1 / y;
  } else {
    return x !== x && y !== y;
  }
}
function isShallowEqual(objA, objB) {
  if (is(objA, objB)) {
    return true;
  }

  if (
    typeof objA !== "object" ||
    objA === null ||
    typeof objB !== "object" ||
    objB === null
  ) {
    return false;
  }

  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) {
    return false;
  }

  for (let i = 0; i < keysA.length; i++) {
    if (
      !Object.prototype.hasOwnProperty.call(objB, keysA[i]) ||
      !is(objA[keysA[i]], objB[keysA[i]])
    ) {
      return false;
    }
  }

  return true;
}

export function useShallowCompareMemoize(value) {
  const ref = useRef();
  if (!isShallowEqual(value, ref.current)) {
    ref.current = value;
  }
  return ref.current;
}

export function cloneShallow(value) {
  return typeof value === "object" ? { ...value } : value;
}
