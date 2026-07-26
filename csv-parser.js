function isBlankRow(cells) {
  return cells.every((cell) => cell.trim() === '');
}

export function parseCsv(text) {
  const rows = [];
  let cells = [];
  let cell = '';
  let line = 1;
  let rowLine = 1;
  let column = 1;
  let quoted = false;
  let quotedColumn = 1;

  const finishRow = () => {
    cells.push(cell);
    if (!isBlankRow(cells)) {
      rows.push({ line: rowLine, cells });
    }
    cells = [];
    cell = '';
  };

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (quoted) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          cell += '"';
          index += 1;
          column += 2;
        } else {
          quoted = false;
          column += 1;
        }
      } else {
        cell += character;
        if (character === '\n') {
          line += 1;
          column = 1;
        } else {
          column += 1;
        }
      }
      continue;
    }

    if (character === '"' && cell === '') {
      quoted = true;
      quotedColumn = column;
      column += 1;
    } else if (character === ',') {
      cells.push(cell);
      cell = '';
      column += 1;
    } else if (character === '\r' || character === '\n') {
      if (character === '\r' && text[index + 1] === '\n') {
        index += 1;
      }
      finishRow();
      line += 1;
      rowLine = line;
      column = 1;
    } else {
      cell += character;
      column += 1;
    }
  }

  if (quoted) {
    return {
      ok: false,
      error: { line: rowLine, column: quotedColumn, message: 'Unclosed quoted field.' },
    };
  }

  if (cell !== '' || cells.length > 0) {
    finishRow();
  }

  return { ok: true, rows };
}
