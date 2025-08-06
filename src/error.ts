class RopNeverError extends Error {
	constructor(message: string) {
		super(`RopNeverError: ${message}\nThis error is caused by a bug in Rop!`);
	}
}

export class CodeContext {
	private lines: {
		content: string;
		// 0-based index of row. Not line number!
		row: number;
		/**
		 * 0-based index of the first character of the line in the source code
		 */
		offset: number;
	}[];

	public constructor(
		private source: string,
		private begin: number,
		private end: number = begin + 1,
	) {
		if (begin < 0) {
			throw new RopNeverError('begin < 0');
		}
		if (end <= begin) {
			throw new RopNeverError('end <= begin');
		}
		if (end > source.length) {
			throw new RopNeverError('end > source.length');
		}

		this.lines = source.split('\n').reduce<typeof this.lines>((lines, content, row) => {
			lines.push({
				content,
				row,
				offset: lines.reduce((ofs, li) => ofs + li.content.length + 1, 0),
			});
			return lines;
		}, []);
	}

	public toIndex(row: number, col: number): number {
		let index = 0;
		for (let i = 0; i < row - 1; i++) {
			index += this.lines[i]!.content.length + 1;
		}
		return index + col;
	}
	public toRowCol(index: number): [number, number] {
		index = Math.min(Math.max(index, 0), this.source.length - 1);
		let row = 0;
		let col = 0;
		for (let i = 0; i < index; i++) {
			if (this.source[i] === '\n') {
				row++;
				col = 0;
			} else {
				col++;
			}
		}
		return [row, col];
	}

	public render(message: string = '', previousLineCount: number = 2) {
		const [beginRow, beginCol] = this.toRowCol(this.begin);
		const [endRow, endCol] = this.toRowCol(this.end);

		const lineNumberWidth = endRow.toString().length;
		const renderedLines = this.lines.slice(beginRow - previousLineCount, endRow + 1);

		let result = '\x1b[0m';
		for (const line of renderedLines) {
			// line number
			result += `\x1b[1m`;
			const lineNumberStr = `${(1 + line.row).toString().padStart(lineNumberWidth, ' ')} | `;
			result += lineNumberStr;
			result += `\x1b[0m`;

			//  line content
			result += line.content;
			result += '\n';

			// If this line contains error
			if (beginRow <= line.row && line.row <= endRow) {
				result += ' '.repeat(lineNumberStr.length);

				const left = line.row === beginRow ? beginCol : 0;
				const right = line.row === endRow ? endCol : line.content.length;

				result += line.content.substring(0, left).replace(/[^\t]/g, ' ');

				result += '\x1b[31m\x1b[1m';
				result += line.content.substring(left, right).replace(/[^\t]/g, '^');
				result += '\x1b[0m';

				result += '\n';
			}
		}
		if (message) {
			result += `\x1b[31m${message}\x1b[0m\n`;
		}

		return result;
	}
}

class RopSyntaxError extends Error {
	protected constructor(
		protected context: CodeContext,
		reason: string,
	) {
		super(`\x1b[91mROP Syntax Error:\n${context.render(reason)}`);
	}
}

export class TokenizingError extends RopSyntaxError {
	public constructor(context: CodeContext, reason: string) {
		super(context, reason);
	}
}
