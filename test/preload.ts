// Bun test preload (see bunfig.toml). Importing the Node debug wiring reads the
// `DEBUG` env var and, when set, installs the stderr trace sink into core - so the
// suite (which imports core directly) prints traces under
// `DEBUG="node-telegram-bot-api:*" bun test ...`. A no-op when DEBUG is unset.
import "../src/node/debug.js";
