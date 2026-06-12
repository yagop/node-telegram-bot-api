/**
 * Tiny `debug`-compatible shim. Activated by setting the DEBUG environment
 * variable to a comma-separated list of namespaces (or "*" / "node-telegram-bot-api*").
 */

function namespaceEnabled(namespace: string): boolean {
  const env = process.env.DEBUG ?? "";
  if (!env) return false;
  return env
    .split(/[\s,]+/)
    .filter(Boolean)
    .some((pattern) => {
      if (pattern === "*") return true;
      if (pattern.endsWith("*")) return namespace.startsWith(pattern.slice(0, -1));
      return pattern === namespace;
    });
}

function format(arg: unknown, formatter?: string): string {
  if (formatter === "%j") return JSON.stringify(arg);
  if (typeof arg === "object") return JSON.stringify(arg);
  return String(arg);
}

export type Debugger = (template: string, ...rest: unknown[]) => void;

export default function createDebug(namespace: string): Debugger {
  const enabled = namespaceEnabled(namespace);
  return (template: string, ...rest: unknown[]) => {
    if (!enabled) return;
    let i = 0;
    const expanded = template.replace(/%[sdjOo%]/g, (token) => {
      if (token === "%%") return "%";
      const value = rest[i++];
      return format(value, token);
    });
    // eslint-disable-next-line no-console
    console.error(`  ${namespace} ${expanded}`);
  };
}
