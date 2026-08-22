const TOOLS = [
  {
    name: "add_todo",
    description: "Add a new task to the todo list",
    parameters: {
      type: "object",
      properties: {
        text: { type: "string", description: "the task to add" },
      },
      required: ["text"],
    },
  },
  {
    name: "complete_todo",
    description: "Mark an existing todo as done by matching its text",
    parameters: {
      type: "object",
      properties: {
        text: { type: "string", description: "words from the task to complete" },
      },
      required: ["text"],
    },
  },
  {
    name: "delete_todo",
    description: "Remove a todo from the list by matching its text",
    parameters: {
      type: "object",
      properties: {
        text: { type: "string", description: "words from the task to delete" },
      },
      required: ["text"],
    },
  },
  {
    name: "mark_streak",
    description: "Mark a daily streak",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "streak name" },
      },
      required: ["name"],
    },
  },
  {
    name: "unmark_streak",
    description: "Unmark a daily streak",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "streak name such as music, code, or cook" },
      },
      required: ["name"],
    },
  },
];

const TOOLS_JSON = JSON.stringify(TOOLS);
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];


function allocCact(Module, bytes) {
  const ptr = Module._malloc(bytes.byteLength);
  if (!ptr) throw new Error("needle malloc failed");
  Module.HEAPU8.set(bytes, ptr);
  return ptr;
}

function needleLoad(Module, ptr, n) {
  try {
    return Module._needle_load(ptr, BigInt(n));
  } catch {
    return Module._needle_load(ptr, n);
  }
}

async function createNeedleEngine(onStatus) {
  const status = (msg) => {
    if (onStatus) onStatus(msg);
  };
  if (typeof createNeedle !== "function") {
    throw new Error("createNeedle missing");
  }
  status("LOADING ENGINE");
  const Module = await createNeedle();
  status("LOADING WEIGHTS");
  const res = await fetch("needle/needle2.cact");
  if (!res.ok) throw new Error("needle2.cact " + res.status);
  const bytes = new Uint8Array(await res.arrayBuffer());
  status("LOADING MODEL");
  const cactPtr = allocCact(Module, bytes);
  const loaded = needleLoad(Module, cactPtr, bytes.byteLength);
  if (loaded !== 0) throw new Error("needle_load " + loaded);

  const outCap = 65536;
  const outPtr = Module._malloc(outCap);

  function init() {
    const rc = Module.ccall(
      "needle_init",
      "number",
      ["string", "string", "number"],
      ['', TOOLS_JSON, 0]
    );
    if (rc < 0) throw new Error("needle_init " + rc);
  }

  function reset() {
    Module._needle_reset();
  }

  function complete(text) {
    const rc = Module.ccall(
      "needle_complete",
      "number",
      ["string", "number", "number", "number"],
      [text, 256, outPtr, outCap]
    );
    if (rc < 0) throw new Error("needle_complete " + rc);
    return JSON.parse(Module.UTF8ToString(outPtr));
  }

  status("INIT");
  init();
  return { init, reset, complete };
}
