function parseJsonArray(output) {
  const start = output.indexOf("[");
  const end = output.lastIndexOf("]");
  if (start === -1 || end < start) {
    throw new Error("Wrangler returned an unexpected JSON response.");
  }
  const parsed = JSON.parse(output.slice(start, end + 1));
  if (!Array.isArray(parsed)) {
    throw new Error("Wrangler returned an unexpected resource list.");
  }
  return parsed;
}

export function databaseIdFromList(output, databaseName) {
  const database = parseJsonArray(output).find(
    (candidate) => candidate?.name === databaseName,
  );
  const id = database?.uuid ?? database?.id;
  return typeof id === "string" && id.length > 0 ? id : null;
}

export function updateD1DatabaseId(source, databaseName, databaseId) {
  const nameLine = `database_name = "${databaseName}"`;
  const nameIndex = source.indexOf(nameLine);
  if (nameIndex === -1 || source.indexOf(nameLine, nameIndex + 1) !== -1) {
    throw new Error(
      `Expected exactly one D1 binding for "${databaseName}" in wrangler.toml.`,
    );
  }

  const sectionStart = source.lastIndexOf("[[d1_databases]]", nameIndex);
  const sectionEnd = source.indexOf("\n[", nameIndex + nameLine.length);
  if (sectionStart === -1) {
    throw new Error(`The D1 binding for "${databaseName}" is malformed.`);
  }

  const end = sectionEnd === -1 ? source.length : sectionEnd;
  const block = source.slice(sectionStart, end);
  if (!/^database_id\s*=\s*"[^"]*"$/m.test(block)) {
    throw new Error(`The D1 binding for "${databaseName}" has no database_id.`);
  }
  const updatedBlock = block.replace(
    /^database_id\s*=\s*"[^"]*"$/m,
    `database_id = "${databaseId}"`,
  );
  return `${source.slice(0, sectionStart)}${updatedBlock}${source.slice(end)}`;
}

export function deploymentList(output) {
  return parseJsonArray(output);
}
